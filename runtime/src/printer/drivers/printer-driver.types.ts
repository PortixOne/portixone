import type { PrintJobInput } from '@portixone/protocol';

export interface PrinterDriver {
  print(job: PrintJobInput): Promise<void>;
}
