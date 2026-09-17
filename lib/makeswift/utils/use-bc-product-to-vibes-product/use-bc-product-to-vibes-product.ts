import { ResultOf } from 'gql.tada';
import { useFormatter } from 'next-intl';
import { useCallback } from 'react';
import { string, z } from 'zod';

import { Product } from '@/vibes/soul/primitives/product-card';
import { ProductCardFragment } from '~/components/product-card/fragment';
import { pricesTransformer } from '~/data-transformers/prices-transformer';
import { getCardImages, getSwatches } from '~/data-transformers/product-card-transformer';

const priceSchema = z.object({
  value: z.number(),
  currencyCode: z.string(),
});

const PricesSchema = z.object({
  price: priceSchema,
  basePrice: priceSchema.nullable(),
  retailPrice: priceSchema.nullable(),
  salePrice: priceSchema.nullable(),
  priceRange: z.object({
    min: priceSchema,
    max: priceSchema,
  }),
});

// `images`/`productOptions`/`swatchVariants` are relayed as-is from the
// `ProductCardFragment`-backed GraphQL response (via the `/api/products/*`
// routes) rather than re-derived here, so they're validated loosely (existence
// only) and typed via the fragment's own result type - this keeps the hover
// carousel/swatch data consistent with the faceted category/brand/search
// pages, which consume the same fragment directly.
export const BcProductSchema = z.object({
  entityId: z.number(),
  name: z.string(),
  defaultImage: z.object({ altText: z.string(), url: string() }).nullable(),
  brand: z.object({ name: z.string(), path: z.string() }).nullable(),
  path: z.string(),
  pricesIncludingTax: PricesSchema.nullable(),
  pricesExcludingTax: PricesSchema.nullable(),
  images: z.custom<ResultOf<typeof ProductCardFragment>['images']>().optional(),
  productOptions: z.custom<ResultOf<typeof ProductCardFragment>['productOptions']>().optional(),
  swatchVariants: z.custom<ResultOf<typeof ProductCardFragment>['swatchVariants']>().optional(),
});

export type BcProductSchema = z.infer<typeof BcProductSchema>;

export type { Product };

export function useBcProductToVibesProduct(): (product: BcProductSchema) => Product {
  const format = useFormatter();

  return useCallback(
    (product) => {
      const { entityId, name, defaultImage, brand, path } = product;
      const price = pricesTransformer(product, format);
      const swatchData = getSwatches(product);

      return {
        id: entityId.toString(),
        title: name,
        href: path,
        image: defaultImage ? { src: defaultImage.url, alt: defaultImage.altText } : undefined,
        images: getCardImages(product),
        price,
        subtitle: brand?.name,
        swatches: swatchData?.swatches,
        extraSwatchCount: swatchData?.extraSwatchCount,
        swatchOptionId: swatchData?.optionId,
      };
    },
    [format],
  );
}
