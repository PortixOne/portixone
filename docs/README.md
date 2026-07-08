# Docs

Placeholder — the public-facing docs site is [`portix.dev/docs`](https://github.com/portixhq/portix.dev). Real, deeper content (driver internals, capability model) is upcoming work per the operating manual. This page covers what's needed today.

## Installation

```bash
npm install @portixone/sdk
```

No printer or runtime handy? Skip straight to [mock mode](#troubleshooting) below — `npm install` is the only step.

## Quickstart

```js
import { Portix } from "@portixone/sdk";

const portix = new Portix({ appId: "my-app", tenant: "default" });

await portix.connect();

await portix.print({
    content: "Hello PortixOne!"
});
```

The printer prints. That's it. `appId`/`tenant` identify your integration to the runtime — the first `connect()` pairs automatically (instant if you're on `localhost`/your own LAN, otherwise it waits for a human to approve it from the PortixOne tray's "Pairing Requests" menu). Every `connect()` after that reuses the same approval — no re-pairing. See [`examples/basic-print`](../examples/basic-print) for a runnable, standalone version of this.

## API reference

- **`new Portix(options?)`** — `mode` (`"runtime"` default, or `"mock"`), `apiKey`, `host`, `port`, `appId`, `tenant`.
- **`portix.connect()`** — verifies the runtime is reachable, and pairs automatically using `appId`/`tenant` if not authorized yet. Call before `print()`/`getStatus()`.
- **`portix.print({ content, printerName?, copies? })`** — sends a print job, returns `{ jobId, status, message? }`.
- **`portix.getStatus()`** — returns `{ status, version, defaultPrinter? }`.

Full reference with types and defaults → [`sdk-js/README.md`](../sdk-js/README.md).

## Troubleshooting

**No printer, or just trying it out?** Use mock mode — zero hardware, zero runtime:
```js
const portix = new Portix({ mode: "mock" });
```

**`Call portix.connect() before using the client`** — you called `print()`/`getStatus()` without awaiting `connect()` first.

**`connect()` reached the Runtime but has no valid credential`** — you called `connect()` without `appId`/`tenant` and without a working `apiKey`. Pass `{ appId, tenant }` so it can pair automatically, or pass the runtime's own admin `apiKey` directly (see `runtime/.env.example`'s `PORTIX_LOCAL_API_KEY`) if you're bypassing pairing on purpose.

**`connect()` hangs, then throws "Pairing request ... expired waiting for approval"`** — you're not on `localhost`/your own LAN (those auto-approve instantly), so a human needs to open the PortixOne tray, go to "Pairing Requests", and approve your app before `connect()` can finish. Call `connect()` again afterward.

**`RuntimeUnreachableError` / "Could not reach the Portix Runtime"** — it isn't installed or isn't running, or `host`/`port` don't match it. The error message already links to [portix.one/download](https://portix.one/download) — in a browser, `connect()` also tries to open that page for you automatically (won't work if it's not inside a click handler; browsers block that). Or switch to mock mode.

**`INVALID_API_KEY`** — you passed an explicit `apiKey` that doesn't match the runtime's admin key (`PORTIX_LOCAL_API_KEY`, see `runtime/.env.example`), or a previously-approved token was revoked. Drop `apiKey` and pass `{ appId, tenant }` instead to let `connect()` pair again.

**`PRINTER_NOT_FOUND`** — no `printerName` was given and no default printer is configured (`PORTIX_DEFAULT_PRINTER` in `runtime/.env`), or the name doesn't match `Get-Printer` exactly.

**`PRINTER_CONNECTION_FAILED`** — the runtime found the printer but couldn't talk to it (unplugged, wrong port, spooler paused).

Still stuck? [Open an issue](https://github.com/portixhq/portixone/issues) — Milestone 2.5 of the [roadmap](../ROADMAP.md) is specifically about finding and fixing exactly these kinds of gaps.

For more:
- SDK reference → [`sdk-js/README.md`](../sdk-js/README.md)
- Running the runtime → [`runtime/README.md`](../runtime/README.md)
