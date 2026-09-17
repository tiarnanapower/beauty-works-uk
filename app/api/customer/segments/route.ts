import { NextResponse } from 'next/server';
import { z } from 'zod';

const BcSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

const BcSegmentsResponseSchema = z.object({
  data: z.array(BcSegmentSchema).optional(),
  meta: z
    .object({
      pagination: z
        .object({
          total_pages: z.number().optional(),
          current_page: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

async function fetchSegmentsPage(
  storeHash: string,
  authToken: string,
  page: number,
): Promise<z.infer<typeof BcSegmentsResponseSchema>> {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v3/segments?limit=250&page=${page}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Token': authToken,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch customer segments: ${response.statusText}`);
  }

  const json: unknown = await response.json();

  return BcSegmentsResponseSchema.parse(json);
}

export async function GET(): Promise<NextResponse> {
  const authToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  if (!authToken || !storeHash) {
    // eslint-disable-next-line no-console
    console.log(
      '[BigCommerce] Provide a store-level API token with "read-only" scope for Customer Segmentation to query the Segments API: https://developer.bigcommerce.com/docs/rest-management/customer-segmentation',
    );

    return NextResponse.json(null, { status: 403 });
  }

  const firstPage = await fetchSegmentsPage(storeHash, authToken, 1);
  const totalPages = firstPage.meta?.pagination?.total_pages ?? 1;
  const remainingPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetchSegmentsPage(storeHash, authToken, i + 2),
          ),
        )
      : [];

  const allSegments = [firstPage, ...remainingPages].flatMap((p) => p.data ?? []);

  return NextResponse.json(
    allSegments.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
    })),
  );
}
