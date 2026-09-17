'use client';

import { useIsInBuilder } from '@makeswift/runtime/react';
import { clsx } from 'clsx';
import { ReactNode } from 'react';
import useSWR from 'swr';

import { CustomerSegmentResponseSchema, CustomerSegmentResponseType } from './schema';

export const NO_SEGMENT_ID = 'no-segment';

async function fetchCustomerSegmentData(): Promise<CustomerSegmentResponseType> {
  const response = await fetch('/api/customer/segment');

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: unknown = await response.json();

  return CustomerSegmentResponseSchema.parse(data);
}

function UntargetedSegment() {
  return (
    <div className="p-4 text-center text-lg text-gray-400">
      This segment needs to be added to "Targeted customer segments".
    </div>
  );
}

function getSegmentSlot(
  allSlots: Array<{ segment?: string; slot: ReactNode }> | undefined,
  simulateSegment: boolean,
  simulatedSegment: string,
  customerSegmentIds: string[],
  noSegmentSlot: ReactNode,
): ReactNode {
  const simulatedSlot = allSlots?.find((s) => s.segment === simulatedSegment)?.slot ?? (
    <UntargetedSegment />
  );

  // A customer can belong to multiple segments. Pick the first targeted segment
  // slot that matches one of the customer's segments.
  const actualSlot = allSlots?.find((s) => s.segment && customerSegmentIds.includes(s.segment))
    ?.slot ?? <UntargetedSegment />;

  if (customerSegmentIds.length === 0 && !simulateSegment) {
    return noSegmentSlot;
  }

  return simulateSegment ? simulatedSlot : actualSlot;
}

export function SlotSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx(className, 'relative w-full animate-pulse p-2')}>
      <div className="line-clamp-1 h-20 w-full rounded-lg bg-contrast-100" />
    </div>
  );
}

interface Props {
  className: string;
  slots?: Array<{ segment?: string; slot: ReactNode }>;
  simulatedSegment?: string;
  noSegmentSlot: ReactNode;
}

export function CustomerSegmentSlot({
  className,
  slots,
  simulatedSegment = NO_SEGMENT_ID,
  noSegmentSlot,
}: Props) {
  const allSlots = slots?.concat({ segment: NO_SEGMENT_ID, slot: noSegmentSlot });
  const isInBuilder = useIsInBuilder();

  const { data, isLoading, error } = useSWR<CustomerSegmentResponseType, Error>(
    '/api/customer/segment',
    fetchCustomerSegmentData,
  );

  if (isLoading) return <SlotSkeleton className={className} />;

  if (error) {
    return (
      <p className={clsx(className, 'p-4 text-center text-gray-500')}>
        An error occurred trying to fetch the customer's segments.
      </p>
    );
  }

  const customerSegmentIds = data?.segmentIds ?? [];
  const segmentSlot = getSegmentSlot(
    allSlots,
    isInBuilder,
    simulatedSegment,
    customerSegmentIds,
    noSegmentSlot,
  );

  return <div className={className}>{segmentSlot}</div>;
}
