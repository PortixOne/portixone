import {
  pairingApproveSchema,
  pairingRequestSchema,
  printJobSchema,
  type PairingApproveInput,
  type PairingRequestInput,
  type PrintJobInput,
} from '@portixone/protocol';
import { InvalidPrintJobError, InvalidRequestError } from '@portixone/shared';

export function validatePrintJob(payload: unknown): PrintJobInput {
  const result = printJobSchema.safeParse(payload);
  if (!result.success) {
    throw new InvalidPrintJobError(result.error.issues.map((issue) => issue.message).join(', '));
  }
  return result.data;
}

export function validatePairingRequest(payload: unknown): PairingRequestInput {
  const result = pairingRequestSchema.safeParse(payload);
  if (!result.success) {
    throw new InvalidRequestError(result.error.issues.map((issue) => issue.message).join(', '));
  }
  return result.data;
}

export function validatePairingApprove(payload: unknown): PairingApproveInput {
  const result = pairingApproveSchema.safeParse(payload);
  if (!result.success) {
    throw new InvalidRequestError(result.error.issues.map((issue) => issue.message).join(', '));
  }
  return result.data;
}
