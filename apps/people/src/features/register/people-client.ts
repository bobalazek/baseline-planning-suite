import {
  peopleSnapshotSchema,
  rateRecordSchema,
  type CreateRateRecordInput,
  type PeopleSnapshot,
  type UpdateRateRecordInput,
} from '@repo/people-contracts';
import type { RateRecord, RateRecordId } from '@repo/shared-common';

/**
 * People's own HTTP client.
 *
 * The base path is relative: the browser always talks to one origin, and the gateway routes
 * `/api/people` to this team's service. That holds whether the app is hosted inside the shell or
 * browsed standalone, so there is no origin to configure and no CORS to arrange.
 *
 * Responses are parsed, not cast. This projection is what Delivery prices a plan from; a malformed
 * rate record has to fail here rather than become a wrong number in a cost cell.
 */
export const PEOPLE_API_BASE = '/api/people';

export interface PeopleClient {
  fetchSnapshot(): Promise<PeopleSnapshot>;
  createRateRecord(input: CreateRateRecordInput): Promise<RateRecord>;
  updateRateRecord(rateRecordId: RateRecordId, input: UpdateRateRecordInput): Promise<RateRecord>;
  deleteRateRecord(rateRecordId: RateRecordId): Promise<void>;
}

export function createPeopleClient(baseUrl: string = PEOPLE_API_BASE): PeopleClient {
  return {
    async fetchSnapshot() {
      return peopleSnapshotSchema.parse(await request(`${baseUrl}/snapshot`));
    },

    async createRateRecord(input) {
      return rateRecordSchema.parse(
        await request(`${baseUrl}/rate-records`, { method: 'POST', body: input })
      );
    },

    async updateRateRecord(rateRecordId, input) {
      return rateRecordSchema.parse(
        await request(`${baseUrl}/rate-records/${encodeURIComponent(rateRecordId)}`, {
          method: 'PATCH',
          body: input,
        })
      );
    },

    async deleteRateRecord(rateRecordId) {
      await request(`${baseUrl}/rate-records/${encodeURIComponent(rateRecordId)}`, {
        method: 'DELETE',
      });
    },
  };
}

/** Surfaces the service's own message, so a planner sees "two rates cannot claim the same day". */
export class PeopleRequestError extends Error {
  constructor(
    override readonly message: string,
    readonly details: readonly string[] = []
  ) {
    super(message);
    this.name = 'PeopleRequestError';
  }
}

async function request(url: string, init: { method?: string; body?: unknown } = {}): Promise<unknown> {
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
    throw new PeopleRequestError(
      readMessage(payload) ?? `${response.status} ${response.statusText}`,
      readDetails(payload)
    );
  }

  return payload;
}

function readMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;

      return typeof message === 'string' ? message : null;
    }
  }

  return null;
}

function readDetails(payload: unknown): string[] {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;

    if (typeof error === 'object' && error !== null && 'details' in error) {
      const details = (error as { details?: unknown }).details;

      if (Array.isArray(details)) {
        return details.filter((detail): detail is string => typeof detail === 'string');
      }
    }
  }

  return [];
}
