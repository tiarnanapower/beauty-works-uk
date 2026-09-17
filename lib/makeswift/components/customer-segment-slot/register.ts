import { Combobox, Group, List, Slot, Style } from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';

import { CustomerSegmentSlot, NO_SEGMENT_ID } from './client';
import { CustomerSegmentsSchema, CustomerSegmentsType } from './schema';

async function getAllCustomerSegments(): Promise<CustomerSegmentsType | null> {
  const response = await fetch('/api/customer/segments');

  if (!response.ok) {
    if (response.status === 403) {
      // 403 indicates the store-level API token is not configured, which is the default OCC setup
      return null;
    }

    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: unknown = await response.json();
  const segments = CustomerSegmentsSchema.parse(data);

  return segments;
}

runtime.registerComponent(CustomerSegmentSlot, {
  type: 'catalyst-customer-segment-slot',
  label: 'Catalyst / Customer Segment Slot',
  props: {
    className: Style(),
    slots: List({
      label: 'Targeted customer segments',
      type: Group({
        label: 'Segment',
        props: {
          segment: Combobox({
            label: 'Name',
            getOptions: async (query) => {
              try {
                const data = await getAllCustomerSegments();

                if (!data) return [];

                return data
                  .map((d) => ({
                    id: d.id,
                    label: d.name,
                    value: d.id,
                  }))
                  .filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching customer segment options:', error);

                return [];
              }
            },
          }),
          slot: Slot(),
        },
      }),
      getItemLabel(item) {
        return item?.segment.label ?? 'Unselected segment';
      },
    }),
    simulatedSegment: Combobox({
      label: 'Simulated segment',
      getOptions: async (query) => {
        try {
          const data = await getAllCustomerSegments();

          if (!data) {
            // nullish data means we don't have access to the customer segments API
            return [
              {
                id: NO_SEGMENT_ID,
                label: 'Setup needed. See docs.',
                value: NO_SEGMENT_ID,
              },
            ];
          }

          return [
            {
              id: NO_SEGMENT_ID,
              label: 'No segment',
              value: NO_SEGMENT_ID,
            },
            ...data
              .map((d) => ({
                id: d.id,
                label: d.name,
                value: d.id,
              }))
              .filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
          ];
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching customer segment options:', error);

          return [];
        }
      },
    }),
    noSegmentSlot: Slot(),
  },
});
