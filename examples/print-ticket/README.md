# print-ticket

A real restaurant receipt — items, quantities, prices, tax, and a total — built as a properly formatted 32-column ticket, not a "Hello World" string. Standalone project using the public [`@portixone/sdk`](https://www.npmjs.com/package/@portixone/sdk) npm package.

## Run it

```bash
npm install
npm start
```

No runtime, no printer, no `.env` needed — it runs in mock mode and renders the ticket as a boxed text preview in your terminal, e.g.:

```
┌────────────────────────────────────┐
│ PORTIX MOCK PRINT PREVIEW         │
├────────────────────────────────────┤
│           PORTIX CAFE             │
│     123 Main St, Springfield      │
│ 7/5/2026, 10:27:42 PM             │
│ --------------------------------  │
│ 2x Espresso                $6.00  │
│ 1x Croissant               $4.50  │
│ 1x Orange Juice            $3.50  │
│ --------------------------------  │
│ Subtotal                  $14.00  │
│ Tax (8%)                   $1.12  │
│ TOTAL                     $15.12  │
│ ================================  │
│     Thank you for visiting!       │
├────────────────────────────────────┤
│ copies: 1                         │
└────────────────────────────────────┘
```

## Print for real

Once you have the [Portix Runtime](https://github.com/portixhq/portixone/tree/master/runtime) running, open `print-ticket.js` and change:

```js
const portix = new Portix({ mode: "mock" });
```

to:

```js
const portix = new Portix({ appId: "print-ticket", tenant: "default" });
```

Run it again. The first run pairs this app with the runtime — since this is a plain Node script (no browser `Origin` header), open the PortixOne tray's "Pairing Requests" menu and approve it; the script will be waiting until you do. Every run after that reuses the same approval and prints straight away.

Run `npm start` again — same ticket, now on real hardware.

## Adjusting for your printer

`WIDTH` at the top of `print-ticket.js` is set to `32` — the standard column count for a narrow (58mm) thermal printer. If you're printing on an 80mm printer, change it to `42` or `48` and the layout adjusts automatically (every row is built from that one constant).
