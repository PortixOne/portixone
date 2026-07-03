export type PrinterDriverType = 'mock' | 'network' | 'windows-spooler';

export interface RuntimeConfig {
  port: number;
  host: string;
  apiKey: string;
  defaultPrinter?: string;
  printerDriver: PrinterDriverType;
  networkPrinterHost?: string;
  networkPrinterPort: number;
}
