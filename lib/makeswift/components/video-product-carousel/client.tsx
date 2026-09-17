'use client';

import { useLocale } from 'next-intl';
import useSWR from 'swr';

import {
  VideoProductCarousel,
  VideoProductCarouselSlide,
  type VideoProductSlide,
} from '@/vibes/soul/sections/video-product-carousel';
import { Image } from '~/components/image';
import { type ProductOptionSelection } from '~/lib/makeswift/utils/search-product-options';
import {
  BcProductSchema,
  useBcProductToVibesProduct,
} from '~/lib/makeswift/utils/use-bc-product-to-vibes-product/use-bc-product-to-vibes-product';

interface Item {
  videoUrl?: string;
  posterImage?: { url: string; dimensions: { width: number; height: number } };
  products?: Array<ProductOptionSelection | undefined>;
}

interface MSVideoProductCarouselProps {
  className: string;
  items?: Item[];
  visibleItems?: number;
  autoplayVideos?: boolean;
  loopCarousel?: boolean;
  autoplayInterval?: number;
  showButtons?: boolean;
  colorScheme?: 'light' | 'dark';
}

// eslint-disable-next-line valid-jsdoc
/**
 * One tagged product row: fetches and renders itself independently (reusing
 * the same `/api/products/[entityId]` + BcProductSchema + hook bridge the
 * standalone Makeswift product card uses), so each row is its own hook call
 * site - safe no matter how many products are tagged on a video or added
 * live in the builder.
 */
function TaggedProductRow({ selection }: { selection: ProductOptionSelection }) {
  const locale = useLocale();
  const bcProductToVibesProduct = useBcProductToVibesProduct();

  const { data, isLoading } = useSWR(
    `/api/products/${selection.entityId}?locale=${locale}`,
    async (url) =>
      fetch(url)
        .then((r) => r.json())
        .then(BcProductSchema.parse),
  );

  if (isLoading || !data) {
    return (
      <div className="flex animate-pulse items-center gap-3">
        <span className="size-10 shrink-0 rounded-md bg-contrast-100" />
        <span className="h-4 w-24 rounded bg-contrast-100" />
      </div>
    );
  }

  const product = bcProductToVibesProduct(data);
  const selectedSwatch =
    selection.valueId != null
      ? product.swatches?.find((swatch) => swatch.id === selection.valueId)
      : undefined;
  const label =
    selection.valueLabel != null ? `${selection.title} — ${selection.valueLabel}` : selection.title;
  const href =
    selection.optionId != null && selection.valueId != null
      ? `${product.href}?${selection.optionId}=${selection.valueId}`
      : product.href;
  const image = selectedSwatch?.image ?? product.image;

  return (
    <a className="flex items-center gap-3" href={href}>
      <span className="relative block size-10 shrink-0 overflow-hidden rounded-md bg-contrast-100">
        {image && <Image alt={image.alt} fill sizes="40px" src={image.src} />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
    </a>
  );
}

function VideoSlideContent({ item, autoplayVideos }: { item: Item; autoplayVideos?: boolean }) {
  const products = (item.products ?? []).filter(
    (selection): selection is ProductOptionSelection => selection != null,
  );

  return (
    <VideoProductCarouselSlide
      autoplay={autoplayVideos}
      poster={item.posterImage?.url}
      productRows={products.map((selection, index) => (
        <TaggedProductRow
          key={`${selection.entityId}-${selection.valueId ?? index}`}
          selection={selection}
        />
      ))}
      videoUrl={item.videoUrl}
    />
  );
}

export function MSVideoProductCarousel({
  className,
  items = [],
  visibleItems,
  autoplayVideos,
  loopCarousel,
  autoplayInterval,
  showButtons,
  colorScheme,
}: MSVideoProductCarouselProps) {
  const slides: VideoProductSlide[] = items.map((item, index) => ({
    key: `${item.videoUrl ?? 'slide'}-${index}`,
    content: (
      <VideoSlideContent
        autoplayVideos={autoplayVideos}
        item={item}
        key={`${item.videoUrl ?? 'slide'}-${index}`}
      />
    ),
  }));

  return (
    <VideoProductCarousel
      autoplay={loopCarousel}
      autoplayInterval={autoplayInterval}
      className={className}
      colorScheme={colorScheme}
      showButtons={showButtons}
      slides={slides}
      visibleItems={visibleItems}
    />
  );
}
