'use client';

import { clsx } from 'clsx';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
  Carousel,
  type CarouselApi,
  CarouselButtons,
  CarouselContent,
  CarouselItem,
} from '@/vibes/soul/primitives/carousel';

// Lets `VideoProductCarouselSlide` grow taller while centered without the parent
// `VideoProductCarousel` needing to reach into a slide's pre-rendered content (each slide is an
// opaque `ReactNode` built by the caller - see `VideoProductSlide.content` below). Context still
// reaches it because it's provided by an ancestor in the actual React tree, regardless of when
// the node was constructed.
const ActiveSlideContext = createContext(false);

export interface VideoProductSlide {
  key: string;
  /**
   * Fully-rendered slide content (video + tagged products, including any
   * data fetching it needs). Kept as an opaque ReactNode - rather than a
   * data shape this component fetches/transforms itself - so each slide can
   * be its own mounted component instance (see the Makeswift wrapper) and
   * safely use its own hooks per list item, instead of calling hooks in a
   * loop over an array of plain data.
   */
  content: ReactNode;
}

export interface VideoProductCarouselProps {
  slides: VideoProductSlide[];
  className?: string;
  colorScheme?: 'light' | 'dark';
  visibleItems?: number;
  showButtons?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
}

// eslint-disable-next-line valid-jsdoc
/**
 * An infinitely-looping carousel pairing a muted autoplaying video with one
 * or more tagged products per slide - e.g. shoppable influencer/UGC video
 * content. `opts={{ loop: true }}` makes the carousel wrap around forever
 * instead of stopping at the last slide; pair with `autoplay` to also
 * advance on its own.
 *
 * Tiles are fixed-width (not a percentage of the container) and centered via
 * embla's `align: 'center'`, so neighboring slides peek in from both edges.
 * Clicking any slide scrolls it to center and its video grows taller while
 * active, animating back down when another slide is selected - the same
 * "spotlight" interaction pattern as the Tolstoy widget this component's
 * design was modeled on.
 */
export function VideoProductCarousel({
  slides,
  className,
  colorScheme = 'light',
  showButtons = true,
  autoplay = true,
  autoplayInterval = 4000,
}: VideoProductCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const plugins = autoplay ? [Autoplay({ delay: autoplayInterval })] : [];

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setSelectedIndex(api.selectedSnap());

    onSelect();
    api.on('select', onSelect);
    api.on('reinit', onSelect);

    return () => {
      api.off('select', onSelect);
      api.off('reinit', onSelect);
    };
  }, [api]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <Carousel
      className={clsx('overflow-x-hidden', className)}
      // The centered slide's video grows taller than its neighbors (see
      // `ActiveSlideContext` below), so vertical overflow must stay visible or it'd get clipped;
      // horizontal overflow still needs hiding to keep off-screen loop slides out of view.
      hideOverflow={false}
      opts={{ loop: true, align: 'center', containScroll: false }}
      plugins={plugins}
      setApi={setApi}
    >
      <div className="mb-6">
        {/*
         * Cards are centered in a *fixed-height* region, matching the real widget (tiles with
         * `align-items: center` inside a fixed-height track). Every inactive card is exactly the
         * same height - the product panel below is pinned to 90px, so title wrapping can't change
         * it - so they all sit on one line and stay perfectly still; only the active card grows,
         * symmetrically about that line.
         *
         * The height must live on this flex row itself, NOT on an ancestor: `CarouselContent`
         * renders an intermediate embla viewport div with a hardcoded auto-height class, so
         * `h-full` here would resolve `height: 100%` against an indefinite parent and silently
         * collapse back to "as tall as the tallest card". The row then shrank mid-slide (the
         * outgoing card is already shrinking while the incoming one hasn't finished growing) and
         * `items-center` lurched every card up and back - measured at ~56px of bob per
         * transition, against zero on the real widget.
         *
         * Height is that widget's centered tile: a 500px video over a 90px panel, i.e. 500/300 of
         * the tile width (a `1/5` share of the carousel minus its `pl-4` gutter) plus that 90px.
         */}
        <CarouselContent className="h-[calc((20cqw-16px)*1.6667+90px)] items-center">
          {slides.map((slide, index) => (
            <CarouselItem
              className={clsx(
                // Exactly 5 slides visible at all times (1/5 each) - fixed regardless of
                // selection, so only the slide's internal video height changes on select (see
                // ActiveSlideContext). Embla's loop mode clones slides based on measured slide
                // width; if width itself changed on select, the clones (and the "peek" of the
                // last slides to the left of the first one on load) would be
                // miscalculated/missing.
                'min-w-0 shrink-0 grow-0 basis-1/5 cursor-pointer pl-4 @2xl:pl-5',
                index === selectedIndex && 'z-10',
              )}
              key={slide.key}
              onClick={() => api?.goTo(index)}
            >
              <ActiveSlideContext.Provider value={index === selectedIndex}>
                {slide.content}
              </ActiveSlideContext.Provider>
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>
      {showButtons && (
        <div className="flex justify-end gap-2">
          <CarouselButtons colorScheme={colorScheme} />
        </div>
      )}
    </Carousel>
  );
}

// eslint-disable-next-line valid-jsdoc
/**
 * A single slide: a muted/looping autoplay video (with a mute/unmute toggle
 * button, bottom-right) and a collapsible strip of tagged products below it
 * - the first product row always visible, the rest revealed by the chevron.
 *
 * `productRows` are pre-rendered by the caller (each fetches/links its own
 * product independently) rather than raw product data, so this component
 * stays purely presentational - it only knows "first row" vs "the rest",
 * not anything about how a row fetches or what it links to.
 */
export function VideoProductCarouselSlide({
  videoUrl,
  poster,
  productRows,
  autoplay = true,
}: {
  videoUrl?: string;
  poster?: string;
  productRows: ReactNode[];
  autoplay?: boolean;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive = useContext(ActiveSlideContext);

  const toggleMuted = () => {
    setIsMuted((muted) => {
      if (videoRef.current) videoRef.current.muted = !muted;

      return !muted;
    });
  };

  // Only the active (centered) slide actually plays - the rest sit paused at frame 0, which
  // browsers render as the `poster` image (never applying autoplay to a slide off-center avoids
  // ever kicking off playback that then has to be paused after the fact).
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (isActive && autoplay) {
      video.currentTime = 0;
      void video.play();
    } else {
      video.pause();
    }
  }, [isActive, autoplay]);

  const [firstRow, ...restRows] = productRows;

  return (
    // No `gap` between the video and the product panel, matching the real widget's `gap: 0px`
    // (its 500px video + 90px panel = the 590px centered tile exactly).
    <div className="flex flex-col">
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-2xl bg-contrast-100 transition-[height] duration-500 ease-out',
          // The real Tolstoy widget's tile proportions: 300px wide with a 388px video that grows
          // to 500px while centered. Sized off the slide's own fluid width (a `1/5` share of the
          // carousel, minus its `pl-4` gutter) so the ratio holds at any container width.
          isActive ? 'h-[calc((20cqw-16px)*1.6667)]' : 'h-[calc((20cqw-16px)*1.2933)]',
        )}
      >
        {videoUrl != null && videoUrl !== '' && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- silent, muted-by-default decorative marketing clips with no dialogue/captions to author */}
            <video
              className="absolute inset-0 size-full object-cover"
              loop
              muted={isMuted}
              playsInline
              poster={poster}
              ref={videoRef}
              src={videoUrl}
            />
            <button
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className="absolute bottom-3 right-3 z-20 flex size-8 items-center justify-center rounded-full bg-foreground/40 text-background backdrop-blur-sm transition-colors hover:bg-foreground/60"
              onClick={toggleMuted}
              type="button"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </>
        )}

        {/* Expanded product list covers the video entirely rather than pushing content below
            it, so opening it never changes the slide's height or the carousel's layout. */}
        {isExpanded && productRows.length > 0 && (
          <div className="absolute inset-0 z-10 flex flex-col bg-background/95 backdrop-blur-sm">
            <ul className="flex-1 divide-y divide-contrast-100 overflow-y-auto p-2">
              {productRows.map((row, index) => (
                <li className="p-2" key={index}>
                  {row}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {firstRow != null && (
        // Fixed 90px (the real widget's `min-height:90px; max-height:90px`) so a longer product
        // title wrapping to a second line can't change the card's height and nudge it vertically.
        <div className="h-[90px] rounded-lg border border-contrast-100">
          <div className="flex h-full w-full items-center gap-1 p-2">
            <div className="min-w-0 flex-1">{firstRow}</div>
            {restRows.length > 0 && (
              <button
                aria-label={isExpanded ? 'Show fewer products' : 'Show more products'}
                className="flex size-8 shrink-0 items-center justify-center"
                onClick={() => setIsExpanded((expanded) => !expanded)}
                type="button"
              >
                <ChevronDown
                  className={
                    isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'
                  }
                  size={16}
                />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
