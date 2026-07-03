import { z } from 'zod';

export const printJobSchema = z.object({
  content: z.string().min(1),
  printerName: z.string().min(1).optional(),
  copies: z.number().int().positive().optional(),
});

export type PrintJobInput = z.infer<typeof printJobSchema>;
