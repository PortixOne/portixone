export class PortixError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class PrinterNotFoundError extends PortixError {
  constructor(printerName?: string) {
    super(
      printerName ? `Printer not found: ${printerName}` : 'No printer available',
      'PRINTER_NOT_FOUND',
    );
  }
}

export class InvalidApiKeyError extends PortixError {
  constructor() {
    super('Invalid or missing API key', 'INVALID_API_KEY');
  }
}

export class InvalidPrintJobError extends PortixError {
  constructor(details: string) {
    super(`Invalid print job: ${details}`, 'INVALID_PRINT_JOB');
  }
}

export class JobNotFoundError extends PortixError {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND');
  }
}

export class PrinterConnectionError extends PortixError {
  constructor(details: string) {
    super(`Could not reach printer: ${details}`, 'PRINTER_CONNECTION_FAILED');
  }
}
