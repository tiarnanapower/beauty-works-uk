import {
  Checkbox,
  Combobox,
  Group,
  Image,
  List,
  Number,
  Select,
  Style,
  TextInput,
} from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';
import { searchProductOptions } from '~/lib/makeswift/utils/search-product-options';

import { MSVideoProductCarousel } from './client';

runtime.registerComponent(MSVideoProductCarousel, {
  type: 'catalog-video-product-carousel',
  label: 'Catalog / Shoppable Video Carousel',
  icon: 'carousel',
  props: {
    className: Style(),
    items: List({
      label: 'Videos',
      type: Group({
        label: 'Video',
        props: {
          videoUrl: TextInput({ label: 'Video URL (mp4)', defaultValue: '' }),
          posterImage: Image({ label: 'Poster image', format: Image.Format.WithDimensions }),
          products: List({
            label: 'Tagged products',
            type: Combobox({
              label: 'Product (+ color)',
              async getOptions(query) {
                return searchProductOptions(query);
              },
            }),
            getItemLabel(product) {
              return product?.label ?? 'Product';
            },
          }),
        },
      }),
      getItemLabel(item) {
        return item?.products[0]?.value?.title ?? 'Video';
      },
    }),
    visibleItems: Number({
      label: 'Visible items',
      min: 1,
      max: 6,
      defaultValue: 3,
    }),
    autoplayVideos: Checkbox({
      label: 'Autoplay videos (muted)',
      defaultValue: true,
    }),
    loopCarousel: Checkbox({
      label: 'Auto-advance carousel',
      defaultValue: true,
    }),
    autoplayInterval: Number({
      label: 'Auto-advance interval (ms)',
      min: 1000,
      defaultValue: 4000,
    }),
    showButtons: Checkbox({
      label: 'Show arrows',
      defaultValue: true,
    }),
    colorScheme: Select({
      label: 'Text color scheme',
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
      defaultValue: 'light',
    }),
  },
});
