import { z } from 'zod';

/** The wire contract of `delivery-api`. See the People equivalent for why the client parses too. */
export const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'expected YYYY-MM-DD');

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});

export const breakdownItemSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  name: z.string().min(1),
});

export const allocationSchema = z.object({
  id: z.string().min(1),
  breakdownItemId: z.string().min(1),
  employeeId: z.string().min(1),
  month: monthKeySchema,
  amount: z.number().nonnegative(),
  updatedAt: z.string().min(1),
  updatedBy: z.string().min(1),
});

export const deliverySnapshotSchema = z.object({
  projects: z.array(projectSchema),
  breakdownItems: z.array(breakdownItemSchema),
  allocations: z.array(allocationSchema),
});

export const upsertAllocationSchema = z.object({
  breakdownItemId: z.string().min(1),
  employeeId: z.string().min(1),
  month: monthKeySchema,
  /** Person-months. Zero deletes the cell rather than storing an empty allocation. */
  amount: z.number().nonnegative(),
  updatedBy: z.string().min(1),
});

export const createBreakdownItemSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  name: z.string().min(1),
});

export const updateBreakdownItemSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().min(1).nullable().optional(),
});

export type ProjectDto = z.infer<typeof projectSchema>;
export type BreakdownItemDto = z.infer<typeof breakdownItemSchema>;
export type AllocationDto = z.infer<typeof allocationSchema>;
export type DeliverySnapshotDto = z.infer<typeof deliverySnapshotSchema>;
export type UpsertAllocationDto = z.infer<typeof upsertAllocationSchema>;
export type CreateBreakdownItemDto = z.infer<typeof createBreakdownItemSchema>;
export type UpdateBreakdownItemDto = z.infer<typeof updateBreakdownItemSchema>;
