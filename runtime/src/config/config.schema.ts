import { z } from 'zod';

export const runtimeConfigSchema = z.object({
  port: z.number().int().positive(),
  host: z.string().min(1),
  apiKey: z.string().min(1),
  defaultPrinter: z.string().optional(),
});
