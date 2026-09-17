import { z } from 'zod';

export const CustomerSegmentsSchema = z.nullable(
  z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional().nullable(),
    })
    .array(),
);

export type CustomerSegmentsType = z.infer<typeof CustomerSegmentsSchema>;

export const CustomerSegmentResponseSchema = z.object({
  segmentIds: z.array(z.string()),
});

export type CustomerSegmentResponseType = z.infer<typeof CustomerSegmentResponseSchema>;
