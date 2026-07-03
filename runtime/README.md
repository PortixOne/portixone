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

## Module status

Everything listed in `src/` is implemented for the MVP flow (Windows printing via the JS SDK). `printer/drivers/mock.driver.ts` logs the job as printed — real ESC/POS integration (`packages/escpos`) and the Windows spooler is the next iteration.

**Future capability managers** (not implemented, not even as empty folders, by design — off-limits in the first 90 days): USB Manager, Bluetooth Manager, TCP Manager, Serial Manager, Driver Registry, Updater. These get added once the roadmap reaches cash drawer/scales/other devices.
