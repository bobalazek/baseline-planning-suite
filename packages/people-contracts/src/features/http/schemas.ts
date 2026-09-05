import { z } from 'zod';

/**
 * The wire contract of `people-api`. Both the service and its client are typed from these schemas,
 * so a response shape cannot drift on one side without the other failing to compile.
 *
 * Parsing happens on the client too, not only the server: the store behind People's contract is
 * the thing Delivery prices a plan from, and a silently malformed rate record would surface as a
 * wrong number in a cost cell rather than as an error.
 */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'expected YYYY-MM-DD');

export const employeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  weeklyHours: z.union([z.literal(40), z.literal(32), z.literal(20)]),
});

export const rateRecordSchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  validFrom: isoDateSchema,
  hourlyCost: z.number().nonnegative(),
});

export const peopleSnapshotSchema = z.object({
  employees: z.array(employeeSchema),
  rateRecords: z.array(rateRecordSchema),
});

export const createRateRecordSchema = z.object({
  employeeId: z.string().min(1),
  validFrom: isoDateSchema,
  hourlyCost: z.number().nonnegative(),
});

export const updateRateRecordSchema = z.object({
  validFrom: isoDateSchema.optional(),
  hourlyCost: z.number().nonnegative().optional(),
});

export type EmployeeDto = z.infer<typeof employeeSchema>;
export type RateRecordDto = z.infer<typeof rateRecordSchema>;
export type PeopleSnapshotDto = z.infer<typeof peopleSnapshotSchema>;
export type CreateRateRecordDto = z.infer<typeof createRateRecordSchema>;
export type UpdateRateRecordDto = z.infer<typeof updateRateRecordSchema>;
