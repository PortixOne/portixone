import type { ServerResponse } from 'node:http';
import type { PrinterManager } from '../printer/printer.manager.js';

export async function handleListPrinters(res: ServerResponse, printerManager: PrinterManager): Promise<void> {
  const printers = await printerManager.listPrinters();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(printers));
}

export async function handleGetPrinter(
  res: ServerResponse,
  printerManager: PrinterManager,
  name: string,
): Promise<void> {
  const printer = await printerManager.getPrinter(name);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(printer));
}
