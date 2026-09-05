import { type CreateBreakdownItemInput, type DeliverySnapshot, type UpdateBreakdownItemInput, type UpsertAllocationInput } from '@repo/delivery-contracts';
import type { Allocation, BreakdownItem, BreakdownItemId } from '@repo/shared-common';
/**
 * Delivery's own HTTP client. Relative base path: the browser talks to one origin and the gateway
 * routes `/api/delivery` to this team's service, hosted or standalone.
 */
export declare const DELIVERY_API_BASE = "/api/delivery";
export interface DeliveryClient {
    fetchSnapshot(): Promise<DeliverySnapshot>;
    upsertAllocation(input: UpsertAllocationInput): Promise<Allocation | null>;
    createBreakdownItem(input: CreateBreakdownItemInput): Promise<BreakdownItem>;
    updateBreakdownItem(itemId: BreakdownItemId, input: UpdateBreakdownItemInput): Promise<BreakdownItem>;
    deleteBreakdownItem(itemId: BreakdownItemId): Promise<void>;
}
export declare function createDeliveryClient(baseUrl?: string): DeliveryClient;
/** Surfaces the service's own message, including the detail lines a refused move comes with. */
export declare class DeliveryRequestError extends Error {
    readonly message: string;
    readonly details: readonly string[];
    constructor(message: string, details?: readonly string[]);
}
