import { printJobSchema, type PrintJobInput } from '@portixone/protocol';
import { InvalidPrintJobError } from '@portixone/shared';

export function validatePrintJob(payload: unknown): PrintJobInput {
  const result = printJobSchema.safeParse(payload);
  if (!result.success) {
    throw new InvalidPrintJobError(result.error.issues.map((issue) => issue.message).join(', '));
  }
  return result.data;
}
