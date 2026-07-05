import { z } from 'zod';

export const pairingRequestSchema = z.object({
  tenant: z.string().min(1),
  appId: z.string().min(1),
});

export type PairingRequestInput = z.infer<typeof pairingRequestSchema>;

export const pairingApproveSchema = z.object({
  code: z.string().min(1),
});

export type PairingApproveInput = z.infer<typeof pairingApproveSchema>;
