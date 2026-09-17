import { useRef, useState } from 'react';

interface CardImage {
  src: string;
  alt: string;
}

interface Params {
  image?: CardImage;
  images?: CardImage[];
  swatches?: Array<{ image?: CardImage }>;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Drives the product card's image area: scrubbing left-to-right across the
 * image cycles through the product's additional images (everything but the
 * main image), and hovering a swatch shows that color's variant image
 * instead. Every image the card could show is preloaded up front (mounted
 * but hidden) so switching between them is instant.
 */
export function useProductCardImageHover({ image, images, swatches }: Params) {
  const additionalImages = (images ?? []).filter((img) => img.src !== image?.src);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [swatchHoverImage, setSwatchHoverImage] = useState<CardImage | null>(null);
  // The scrub handlers are attached to the card's outer wrapper (rather than
  // the image container itself) so they still receive events bubbling up
  // through the full-card `<Link>` overlay, which sits on top of the image
  // in paint order - but scrubbing should only react while the pointer is
  // actually over the image, not the title/price/swatch row underneath it.
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const onImageMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (additionalImages.length === 0) return;

    const rect = imageContainerRef.current?.getBoundingClientRect();

    if (!rect || event.clientY < rect.top || event.clientY > rect.bottom) {
      setHoverIndex(null);

      return;
    }

    const fraction = (event.clientX - rect.left) / rect.width;
    const index = Math.min(
      additionalImages.length - 1,
      Math.max(0, Math.floor(fraction * additionalImages.length)),
    );

    setHoverIndex(index);
  };

  const onImageMouseLeave = () => {
    setHoverIndex(null);
  };

  const displayedImage =
    swatchHoverImage ?? (hoverIndex != null ? additionalImages[hoverIndex] : image);

  const preloadImages = new Map<string, CardImage>();

  [image, ...additionalImages, ...(swatches ?? []).map((swatch) => swatch.image)].forEach(
    (candidate) => {
      if (candidate) preloadImages.set(candidate.src, candidate);
    },
  );

  return {
    additionalImages,
    hoverIndex,
    displayedImage,
    preloadImages,
    imageContainerRef,
    onImageMouseMove,
    onImageMouseLeave,
    setSwatchHoverImage,
  };
}
