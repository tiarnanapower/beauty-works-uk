import { PricingFragment } from '~/client/fragments/pricing';
import { graphql } from '~/client/graphql';

export const ProductCardFragment = graphql(
  `
    fragment ProductCardFragment on Product {
      entityId
      name
      defaultImage {
        altText
        url: urlTemplate(lossy: true)
      }
      images(first: 6) {
        edges {
          node {
            altText
            url: urlTemplate(lossy: true)
            isDefault
          }
        }
      }
      productOptions(first: 10) {
        edges {
          node {
            __typename
            entityId
            displayName
            ... on MultipleChoiceOption {
              displayStyle
              values(first: 50) {
                edges {
                  node {
                    entityId
                    label
                    ... on SwatchOptionValue {
                      __typename
                      hexColors
                      imageUrl(lossy: true, width: 40)
                    }
                  }
                }
              }
            }
          }
        }
      }
      path
      brand {
        name
        path
      }
      inventory {
        hasVariantInventory
        isInStock
        aggregated {
          availableForBackorder
          unlimitedBackorder
          availableOnHand
        }
      }
      reviewSummary {
        numberOfReviews
        averageRating
      }
      variants(first: 1) {
        edges {
          node {
            entityId
            sku
            inventory {
              byLocation {
                edges {
                  node {
                    locationEntityId
                    backorderMessage
                  }
                }
              }
            }
          }
        }
      }
      swatchVariants: variants(first: 50) {
        edges {
          node {
            entityId
            defaultImage {
              altText
              url: urlTemplate(lossy: true)
            }
            options(first: 10) {
              edges {
                node {
                  entityId
                  values(first: 50) {
                    edges {
                      node {
                        entityId
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      featuredPromotions {
        edges {
          node {
            entityId
            text
          }
        }
      }
      ...PricingFragment
    }
  `,
  [PricingFragment],
);
