import { type CreateRateRecordInput, type PeopleSnapshot, type UpdateRateRecordInput } from '@repo/people-contracts';
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
export declare const PEOPLE_API_BASE = "/api/people";
export interface PeopleClient {
    fetchSnapshot(): Promise<PeopleSnapshot>;
    createRateRecord(input: CreateRateRecordInput): Promise<RateRecord>;
    updateRateRecord(rateRecordId: RateRecordId, input: UpdateRateRecordInput): Promise<RateRecord>;
    deleteRateRecord(rateRecordId: RateRecordId): Promise<void>;
}
export declare function createPeopleClient(baseUrl?: string): PeopleClient;
/** Surfaces the service's own message, so a planner sees "two rates cannot claim the same day". */
export declare class PeopleRequestError extends Error {
    readonly message: string;
    readonly details: readonly string[];
    constructor(message: string, details?: readonly string[]);
}
