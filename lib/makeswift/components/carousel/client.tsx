import {
  Carousel,
  CarouselButtons,
  CarouselContent,
  CarouselItem,
  CarouselScrollbar,
} from '@/vibes/soul/primitives/carousel';

interface Slide {
  children: React.ReactNode;
}

interface MSCarouselProps {
  className: string;
  slides?: Slide[];
  visibleItems?: number;
  showScrollbar: boolean;
  showArrows: boolean;
  colorScheme: 'light' | 'dark';
  hideOverflow?: boolean;
}

// Tailwind's JIT scanner only generates CSS for class names it can find as
// literal strings in source, so the per-item "basis" width for each visible-
// items count is spelled out here in full rather than built up from
// concatenated pieces - it still degrades to fewer items on smaller screens
// (matching the original fixed 1/2/3/4 breakpoints), capped at the chosen
// max for the largest breakpoint.
const BASIS_CLASSES_BY_VISIBLE_ITEMS: Record<number, string> = {
  1: 'basis-full',
  2: 'basis-full @md:basis-1/2 @lg:basis-1/2 @2xl:basis-1/2',
  3: 'basis-full @md:basis-1/2 @lg:basis-1/3 @2xl:basis-1/3',
  4: 'basis-full @md:basis-1/2 @lg:basis-1/3 @2xl:basis-1/4',
  5: 'basis-full @md:basis-1/2 @lg:basis-1/3 @2xl:basis-1/5',
  6: 'basis-full @md:basis-1/2 @lg:basis-1/3 @2xl:basis-1/6',
};

export function MSCarousel({
  className,
  slides,
  visibleItems = 4,
  showScrollbar = true,
  showArrows = true,
  colorScheme,
  hideOverflow = true,
}: MSCarouselProps) {
  const basisClassName =
    BASIS_CLASSES_BY_VISIBLE_ITEMS[Math.min(Math.max(Math.round(visibleItems), 1), 6)] ??
    BASIS_CLASSES_BY_VISIBLE_ITEMS[4];

  return (
    <div className={className}>
      {!slides || slides.length < 1 ? (
        <div className="p-4 text-center text-lg text-gray-400">Add items to the carousel</div>
      ) : (
        <Carousel hideOverflow={hideOverflow}>
          <CarouselContent className="mb-10">
            {slides.map(({ children }, index) => (
              <CarouselItem className={basisClassName} key={index}>
                {children}
              </CarouselItem>
            ))}
          </CarouselContent>
          {(showScrollbar || showArrows) && (
            <div className="mt-10 flex w-full items-center justify-between">
              {showScrollbar && <CarouselScrollbar colorScheme={colorScheme} />}
              {showArrows && <CarouselButtons colorScheme={colorScheme} />}
            </div>
          )}
        </Carousel>
      )}
    </div>
  );
}
