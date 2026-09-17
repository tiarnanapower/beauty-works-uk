import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const GetCustomerEntityIdQuery = graphql(`
  query CustomerEntityId {
    customer {
      entityId
    }
  }
`);

const ShopperProfilesResponseSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        customer_id: z.number().optional(),
      }),
    )
    .optional(),
});

const ShopperSegmentsResponseSchema = z.object({
  data: z.array(z.object({ segment_id: z.string() })).optional(),
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

const headers = (authToken: string) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Auth-Token': authToken,
});

async function fetchShopperProfileId(
  storeHash: string,
  authToken: string,
  customerId: number,
): Promise<string | undefined> {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v3/shopper-profiles?customer_id:in=${customerId}`,
    { method: 'GET', headers: headers(authToken) },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch shopper profile: ${response.statusText}`);
  }

  const json: unknown = await response.json();
  const parsed = ShopperProfilesResponseSchema.parse(json);

  return parsed.data?.[0]?.id;
}

async function fetchSegmentsPage(
  storeHash: string,
  authToken: string,
  shopperProfileId: string,
  page: number,
): Promise<z.infer<typeof ShopperSegmentsResponseSchema>> {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v3/shopper-profiles/${shopperProfileId}/segments?limit=250&page=${page}`,
    { method: 'GET', headers: headers(authToken) },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch shopper segments: ${response.statusText}`);
  }

  const json: unknown = await response.json();

  return ShopperSegmentsResponseSchema.parse(json);
}

export async function GET(): Promise<NextResponse> {
  const customerAccessToken = await getSessionCustomerAccessToken();

  if (!customerAccessToken) {
    return NextResponse.json({ segmentIds: [] });
  }

  const { data, errors } = await client.fetch({
    document: GetCustomerEntityIdQuery,
    customerAccessToken,
    fetchOptions: { cache: 'no-store' },
  });

  if (errors) {
    return NextResponse.json({ segmentIds: [] });
  }

  const customerId = data.customer?.entityId;
  const authToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;

  if (!customerId || !authToken || !storeHash) {
    return NextResponse.json({ segmentIds: [] });
  }

  const shopperProfileId = await fetchShopperProfileId(storeHash, authToken, customerId);

  if (!shopperProfileId) {
    return NextResponse.json({ segmentIds: [] });
  }

  const firstPage = await fetchSegmentsPage(storeHash, authToken, shopperProfileId, 1);
  const totalPages = firstPage.meta?.pagination?.total_pages ?? 1;
  const remainingPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetchSegmentsPage(storeHash, authToken, shopperProfileId, i + 2),
          ),
        )
      : [];

  const segmentIds = [firstPage, ...remainingPages]
    .flatMap((p) => p.data ?? [])
    .map((s) => s.segment_id);

  return NextResponse.json({ segmentIds });
}
