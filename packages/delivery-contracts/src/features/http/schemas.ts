import type {
  Allocation,
  AllocationId,
  BreakdownItem,
  BreakdownItemId,
  EmployeeId,
  IsoDate,
  MonthKey,
  Project,
  ProjectId,
} from '@repo/shared-common';
import { z } from 'zod';

/**
 * The wire contract of `delivery-api`. Like People's, it produces the domain types directly, so
 * parsing is where a `string` becomes a `BreakdownItemId` and nowhere else.
 */
const projectIdSchema = z.string().min(1).transform((value) => value as ProjectId);
const breakdownItemIdSchema = z.string().min(1).transform((value) => value as BreakdownItemId);
const allocationIdSchema = z.string().min(1).transform((value) => value as AllocationId);
const employeeIdSchema = z.string().min(1).transform((value) => value as EmployeeId);

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM')
  .transform((value) => value as MonthKey);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'expected YYYY-MM-DD')
  .transform((value) => value as IsoDate);

export const projectSchema: z.ZodType<Project, unknown> = z.object({
  id: projectIdSchema,
  name: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});

export const breakdownItemSchema: z.ZodType<BreakdownItem, unknown> = z.object({
  id: breakdownItemIdSchema,
  projectId: projectIdSchema,
  parentId: breakdownItemIdSchema.nullable(),
  name: z.string().min(1),
});

export const allocationSchema: z.ZodType<Allocation, unknown> = z.object({
  id: allocationIdSchema,
  breakdownItemId: breakdownItemIdSchema,
  employeeId: employeeIdSchema,
  month: monthKeySchema,
  /** Person-months — the canonical unit. Never hours, never euro. */
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
  breakdownItemId: breakdownItemIdSchema,
  employeeId: employeeIdSchema,
  month: monthKeySchema,
  /** Zero clears the cell rather than storing an empty allocation. */
  amount: z.number().nonnegative(),
  updatedBy: z.string().min(1),
});

export const createBreakdownItemSchema = z.object({
  projectId: projectIdSchema,
  parentId: breakdownItemIdSchema.nullable(),
  name: z.string().min(1),
});

export const updateBreakdownItemSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: breakdownItemIdSchema.nullable().optional(),
});

export type DeliverySnapshot = z.infer<typeof deliverySnapshotSchema>;
export type UpsertAllocationInput = z.infer<typeof upsertAllocationSchema>;
export type CreateBreakdownItemInput = z.infer<typeof createBreakdownItemSchema>;
export type UpdateBreakdownItemInput = z.infer<typeof updateBreakdownItemSchema>;
