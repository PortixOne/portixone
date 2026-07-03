# Portix Runtime

Headless local bridge (Node.js + TypeScript). Listens on `localhost:<port>` (see `.env.example`), accepts print jobs over HTTP, and reports live status over WebSocket.

## Running in development

```bash
npm run dev
```

First run generates `.data/config.json` with an auto-generated local `apiKey` (or picks up `PORTIX_LOCAL_API_KEY` from the environment) and `.data/runtime.log`. Both are gitignored.

## Endpoints

- `GET /health` → bridge status
- `POST /print` → requires `x-portix-api-key` header, body `{ content, printerName?, copies? }`
- WebSocket (same root) → `status`, `job:queued`, `job:printed`, `job:error` events

## Printer drivers

Set `PORTIX_PRINTER_DRIVER` in `.env` (see `.env.example`):

- `mock` (default) — logs the job as printed, no hardware needed. Good for developing without a printer attached.
- `network` — sends raw ESC/POS bytes to an Ethernet/WiFi thermal printer's raw port (`PORTIX_NETWORK_PRINTER_HOST` / `PORTIX_NETWORK_PRINTER_PORT`, default `9100`). Pure Node `net` socket, no native dependencies. Verified byte-for-byte against a local test listener.
- `windows-spooler` — sends raw ESC/POS bytes to a USB thermal printer installed as a named Windows printer (`PORTIX_DEFAULT_PRINTER`, or per-request `printerName`), via `winspool.drv` through a PowerShell P/Invoke helper (`scripts/send-raw-print.ps1`) — no node-gyp / native addon required. Verified that the script compiles and error-handles correctly; **physical print output has not yet been verified against a real ESC/POS printer** — do that before relying on this in production.

Both real drivers build their byte stream with `packages/escpos`.

## Module status

**Future capability managers** (not implemented, not even as empty folders, by design — off-limits in the first 90 days): USB Manager, Bluetooth Manager, TCP Manager, Serial Manager, Driver Registry, Updater. These get added once the roadmap reaches cash drawer/scales/other devices.
