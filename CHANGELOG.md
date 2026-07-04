# Changelog

## v0.0.1-alpha — 2026-07-03

### Added

- Initial Runtime HTTP API (`/health`, `/print`) with WebSocket status events (`job:queued`, `job:printed`, `job:error`)
- Windows Spooler driver — raw ESC/POS bytes to a named Windows printer via `winspool.drv`, no native addon / node-gyp
- Network driver — raw ESC/POS bytes over TCP/9100 for Ethernet/WiFi thermal printers
- ESC/POS print pipeline (`packages/escpos`)
- JavaScript SDK (`@portixone/sdk`) — `new Portix().connect().print()`

### Fixed

- Print-cut timing — the cutter was firing before the paper cleared the print head, slicing through the last lines of a real receipt. Feed before cut increased from 3 to 5 lines.
- The runtime wasn't loading `.env` at all — `PORTIX_PRINTER_DRIVER` and friends were silently ignored in favor of a stale persisted config. Now loaded via `--env-file-if-exists`.

### Milestone

✅ First successful physical receipt printed.

```
Browser
  ↓
Runtime
  ↓
Windows Spooler
  ↓
Thermal Printer
```

### Notes

Validated on real hardware (a USB ESC/POS thermal printer) via the actual `/print` API route — not the mock driver.

Status: Experimental.
