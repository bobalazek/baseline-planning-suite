import { type DeliveryContract } from '@repo/delivery-contracts';
import type { DeliveryStore } from '../plan/delivery-store';
/**
 * What Delivery publishes: how loaded a person is, and nothing else.
 *
 * People has no business reading a plan — not the projects, not the breakdown, not who is on what.
 * It needs one number per person per month, and that is what crosses the line.
 */
export declare function createDeliveryContract(store: DeliveryStore): DeliveryContract;
