import type { Employee, EmployeeId, IsoDate, RateRecord, RateRecordId } from '@repo/shared-common';
import { z } from 'zod';

/**
 * The wire contract of `people-api`.
 *
 * The schemas produce the domain types, branded ids included, so there is no parallel DTO shape to
 * keep in step and parsing is the only moment a string becomes an `EmployeeId`.
 *
 * The client parses too. Delivery prices a plan from this projection, so a malformed rate record
 * has to fail at the boundary rather than become a wrong number in a cost cell.
 */
const employeeIdSchema = z
  .string()
  .min(1)
  .transform((value) => value as EmployeeId);
const rateRecordIdSchema = z
  .string()
  .min(1)
  .transform((value) => value as RateRecordId);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'expected YYYY-MM-DD')
  .transform((value) => value as IsoDate);

export const employeeSchema: z.ZodType<Employee, unknown> = z.object({
  id: employeeIdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  weeklyHours: z.union([z.literal(40), z.literal(32), z.literal(20)]),
});

export const rateRecordSchema: z.ZodType<RateRecord, unknown> = z.object({
  id: rateRecordIdSchema,
  employeeId: employeeIdSchema,
  validFrom: isoDateSchema,
  hourlyCost: z.number().nonnegative(),
});

export const peopleSnapshotSchema = z.object({
  employees: z.array(employeeSchema),
  rateRecords: z.array(rateRecordSchema),
});

export const createRateRecordSchema = z.object({
  employeeId: employeeIdSchema,
  validFrom: isoDateSchema,
  hourlyCost: z.number().nonnegative(),
});

export const updateRateRecordSchema = z.object({
  validFrom: isoDateSchema.optional(),
  hourlyCost: z.number().nonnegative().optional(),
});

export type PeopleSnapshot = z.infer<typeof peopleSnapshotSchema>;
export type CreateRateRecordInput = z.infer<typeof createRateRecordSchema>;
export type UpdateRateRecordInput = z.infer<typeof updateRateRecordSchema>;
