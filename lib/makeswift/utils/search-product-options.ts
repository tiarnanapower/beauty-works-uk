'use server';

import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';

import { searchProducts } from './search-products';
import { BcProductSchema } from './use-bc-product-to-vibes-product/use-bc-product-to-vibes-product';

export interface ProductOptionSelection {
  // Index signature so this satisfies Makeswift's `Data` (JSON-value)
  // constraint on Combobox's generic - a plain interface without one isn't
  // structurally assignable to `{ [key: string]: Data }`.
  [key: string]: string | undefined;
  entityId: string;
  title: string;
  /** The "Hair Palette"-style swatch option's own entityId, if the product has one. */
  optionId?: string;
  /** The chosen swatch value's entityId - together with `optionId` this is the
   * same `?optionId=valueId` query param the PDP already reads to pre-select
   * a color. */
  valueId?: string;
  valueLabel?: string;
}

// Lists every swatch value for a product (not capped to a handful like the
// product card's display helper), since here the builder user needs to be
// able to pick ANY color, not just the first few shown on a card.
function listSwatchOptionValues(product: BcProductSchema) {
  const noValues: Array<{ id: string; label: string }> = [];

  if (!product.productOptions) {
    return { optionId: undefined, values: noValues };
  }

  const swatchOption = removeEdgesAndNodes(product.productOptions).find(
    (option) => option.__typename === 'MultipleChoiceOption' && option.displayStyle === 'Swatch',
  );

  if (!swatchOption || !('values' in swatchOption)) {
    return { optionId: undefined, values: [] };
  }

  const values = removeEdgesAndNodes(swatchOption.values).filter(
    (value): value is typeof value & { __typename: 'SwatchOptionValue' } =>
      '__typename' in value && value.__typename === 'SwatchOptionValue',
  );

  return {
    optionId: swatchOption.entityId.toString(),
    values: values.map((value) => ({ id: value.entityId.toString(), label: value.label })),
  };
}

export async function searchProductOptions(
  query: string,
): Promise<Array<{ id: string; label: string; value: ProductOptionSelection }>> {
  const products = await searchProducts(query);
  const options: Array<{ id: string; label: string; value: ProductOptionSelection }> = [];

  products.forEach((product) => {
    const { optionId, values } = listSwatchOptionValues(product);

    if (values.length === 0) {
      options.push({
        id: product.entityId.toString(),
        label: product.name,
        value: { entityId: product.entityId.toString(), title: product.name },
      });

      return;
    }

    values.forEach((value) => {
      options.push({
        id: `${product.entityId}-${value.id}`,
        label: `${product.name} — ${value.label}`,
        value: {
          entityId: product.entityId.toString(),
          title: product.name,
          optionId,
          valueId: value.id,
          valueLabel: value.label,
        },
      });
    });
  });

  return options;
}
