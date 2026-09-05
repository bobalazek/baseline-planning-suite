import {
  allocationSchema,
  breakdownItemSchema,
  deliverySnapshotSchema,
  type CreateBreakdownItemInput,
  type DeliverySnapshot,
  type UpdateBreakdownItemInput,
  type UpsertAllocationInput,
} from '@repo/delivery-contracts';
import type { Allocation, BreakdownItem, BreakdownItemId } from '@repo/shared-common';
import { z } from 'zod';

/**
 * Delivery's own HTTP client. Relative base path: the browser talks to one origin and the gateway
 * routes `/api/delivery` to this team's service, hosted or standalone.
 */
export const DELIVERY_API_BASE = '/api/delivery';

const upsertResultSchema = z.object({ allocation: allocationSchema.nullable() });

export interface DeliveryClient {
  fetchSnapshot(): Promise<DeliverySnapshot>;
  upsertAllocation(input: UpsertAllocationInput): Promise<Allocation | null>;
  createBreakdownItem(input: CreateBreakdownItemInput): Promise<BreakdownItem>;
  updateBreakdownItem(
    itemId: BreakdownItemId,
    input: UpdateBreakdownItemInput
  ): Promise<BreakdownItem>;
  deleteBreakdownItem(itemId: BreakdownItemId): Promise<void>;
}

export function createDeliveryClient(baseUrl: string = DELIVERY_API_BASE): DeliveryClient {
  return {
    async fetchSnapshot() {
      return deliverySnapshotSchema.parse(await request(`${baseUrl}/snapshot`));
    },

    async upsertAllocation(input) {
      const result = upsertResultSchema.parse(
        await request(`${baseUrl}/allocations`, { method: 'PUT', body: input })
      );

      return result.allocation;
    },

    async createBreakdownItem(input) {
      return breakdownItemSchema.parse(
        await request(`${baseUrl}/breakdown-items`, { method: 'POST', body: input })
      );
    },

    async updateBreakdownItem(itemId, input) {
      return breakdownItemSchema.parse(
        await request(`${baseUrl}/breakdown-items/${encodeURIComponent(itemId)}`, {
          method: 'PATCH',
          body: input,
        })
      );
    },

    async deleteBreakdownItem(itemId) {
      await request(`${baseUrl}/breakdown-items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
    },
  };
}

/** Surfaces the service's own message, including the detail lines a refused move comes with. */
export class DeliveryRequestError extends Error {
  constructor(
    override readonly message: string,
    readonly details: readonly string[] = []
  ) {
    super(message);
    this.name = 'DeliveryRequestError';
  }
}

async function request(
  url: string,
  init: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    cache: 'no-store',
    ...(init.body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(init.body) }),
  });

  if (response.status === 204) {
    return undefined;
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new DeliveryRequestError(
      readMessage(payload) ?? `${response.status} ${response.statusText}`,
      readDetails(payload)
    );
  }

  return payload;
}

const errorBodySchema = z.object({
  error: z.object({ message: z.string(), details: z.array(z.string()).optional() }),
});

function readMessage(payload: unknown): string | null {
  const parsed = errorBodySchema.safeParse(payload);

  return parsed.success ? parsed.data.error.message : null;
}

function readDetails(payload: unknown): string[] {
  const parsed = errorBodySchema.safeParse(payload);

  return parsed.success ? (parsed.data.error.details ?? []) : [];
}
