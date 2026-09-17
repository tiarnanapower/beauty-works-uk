import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { ResultOf } from 'gql.tada';
import { getFormatter } from 'next-intl/server';

import { Product } from '@/vibes/soul/primitives/product-card';
import { ExistingResultType } from '~/client/util';
import { ProductCardFragment } from '~/components/product-card/fragment';
import { WishlistItemProductFragment } from '~/components/wishlist/fragment';

import { pricesTransformer, TaxDisplay } from './prices-transformer';

const getInventoryMessage = (
  product: ResultOf<typeof ProductCardFragment>,
  outOfStockMessage?: string,
  showBackorderMessage?: boolean,
) => {
  if (!product.inventory.isInStock) {
    return outOfStockMessage;
  }

  if (!showBackorderMessage || product.inventory.hasVariantInventory) {
    return undefined;
  }

  const { availableForBackorder, unlimitedBackorder, availableOnHand } =
    product.inventory.aggregated ?? {};

  if (availableOnHand) {
    return undefined;
  }

  const hasBackorderAvailablity = !!availableForBackorder || unlimitedBackorder;

  if (!hasBackorderAvailablity) {
    return undefined;
  }

  const baseVariant = removeEdgesAndNodes(product.variants).at(0);

  if (!baseVariant?.inventory?.byLocation) {
    return undefined;
  }

  const inventoryByLocation = removeEdgesAndNodes(baseVariant.inventory.byLocation).at(0);

  return inventoryByLocation?.backorderMessage ?? undefined;
};

export const MAX_CARD_SWATCHES = 5;

// A narrower structural type (rather than the full fragment union) so these
// three helpers can also run against the REST-relayed product shape used by
// the Makeswift homepage sections (`use-bc-product-to-vibes-product.ts`),
// which is validated by a Zod schema rather than being a gql.tada result.
export type CardExtrasSource = Record<string, unknown> & {
  images?: ResultOf<typeof ProductCardFragment>['images'];
  productOptions?: ResultOf<typeof ProductCardFragment>['productOptions'];
  swatchVariants?: ResultOf<typeof ProductCardFragment>['swatchVariants'];
};

export const getVariantImageByValueId = (product: CardExtrasSource) => {
  const imageByValueId = new Map<number, { src: string; alt: string }>();

  if (!product.swatchVariants) {
    return imageByValueId;
  }

  removeEdgesAndNodes(product.swatchVariants).forEach((variant) => {
    if (!variant.defaultImage) return;

    const image = { src: variant.defaultImage.url, alt: variant.defaultImage.altText };

    removeEdgesAndNodes(variant.options).forEach((option) => {
      removeEdgesAndNodes(option.values).forEach((value) => {
        if (!imageByValueId.has(value.entityId)) {
          imageByValueId.set(value.entityId, image);
        }
      });
    });
  });

  return imageByValueId;
};

export const getSwatches = (product: CardExtrasSource) => {
  if (!product.productOptions) {
    return undefined;
  }

  const swatchOption = removeEdgesAndNodes(product.productOptions).find(
    (option) => option.__typename === 'MultipleChoiceOption' && option.displayStyle === 'Swatch',
  );

  if (!swatchOption || !('values' in swatchOption)) {
    return undefined;
  }

  const values = removeEdgesAndNodes(swatchOption.values).filter(
    (value): value is typeof value & { __typename: 'SwatchOptionValue' } =>
      '__typename' in value && value.__typename === 'SwatchOptionValue',
  );

  if (values.length === 0) {
    return undefined;
  }

  const variantImageByValueId = getVariantImageByValueId(product);

  return {
    optionId: swatchOption.entityId.toString(),
    swatches: values.slice(0, MAX_CARD_SWATCHES).map((value) => ({
      id: value.entityId.toString(),
      label: value.label,
      color: value.hexColors[0] ?? undefined,
      imageSrc: value.imageUrl ?? undefined,
      image: variantImageByValueId.get(value.entityId),
    })),
    extraSwatchCount: Math.max(values.length - MAX_CARD_SWATCHES, 0),
  };
};

export const getCardImages = (product: CardExtrasSource) =>
  product.images
    ? removeEdgesAndNodes(product.images).map((image) => ({
        src: image.url,
        alt: image.altText,
      }))
    : undefined;

export const singleProductCardTransformer = (
  product: ResultOf<typeof ProductCardFragment | typeof WishlistItemProductFragment>,
  format: ExistingResultType<typeof getFormatter>,
  outOfStockMessage?: string,
  showBackorderMessage?: boolean,
  taxDisplay?: TaxDisplay | null,
): Product => {
  const swatchData = getSwatches(product);

  return {
    id: product.entityId.toString(),
    title: product.name,
    href: product.path,
    image: product.defaultImage
      ? { src: product.defaultImage.url, alt: product.defaultImage.altText }
      : undefined,
    images: getCardImages(product),
    price: pricesTransformer(product, format, taxDisplay),
    subtitle: product.brand?.name ?? undefined,
    rating: product.reviewSummary.averageRating,
    numberOfReviews: product.reviewSummary.numberOfReviews,
    inventoryMessage:
      'variants' in product
        ? getInventoryMessage(product, outOfStockMessage, showBackorderMessage)
        : undefined,
    promotions:
      'featuredPromotions' in product
        ? removeEdgesAndNodes(product.featuredPromotions).map((p) => ({
            id: p.entityId.toString(),
            text: p.text,
          }))
        : undefined,
    swatches: swatchData?.swatches,
    extraSwatchCount: swatchData?.extraSwatchCount,
    swatchOptionId: swatchData?.optionId,
  };
};

export const productCardTransformer = (
  products: Array<ResultOf<typeof ProductCardFragment | typeof WishlistItemProductFragment>>,
  format: ExistingResultType<typeof getFormatter>,
  outOfStockMessage?: string,
  showBackorderMessage?: boolean,
  taxDisplay?: TaxDisplay | null,
): Product[] => {
  return products.map((product) =>
    singleProductCardTransformer(
      product,
      format,
      outOfStockMessage,
      showBackorderMessage,
      taxDisplay,
    ),
  );
};
