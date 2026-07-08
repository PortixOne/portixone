# basic-print

The smallest possible PortixOne project — a real, standalone Node.js app that installs [`@portixone/sdk`](https://www.npmjs.com/package/@portixone/sdk) from npm like any other dependency. No monorepo, no workspace, no relative imports into `sdk-js/`.

## Run it

```bash
npm install
npm start
```

That's it — no runtime, no printer, no `.env`. It runs in mock mode and prints a text preview of the receipt to your terminal.

## Print for real

Once you have the [Portix Runtime](https://github.com/portixhq/portixone/tree/master/runtime) running, open `index.js` and change:

```js
const portix = new Portix({ mode: "mock" });
```

to:

```js
const portix = new Portix({ appId: "basic-print", tenant: "default" });
```

Run `npm start` again. The first run pairs this app with the runtime — since this is a plain Node script (no browser `Origin` header), that means opening the PortixOne tray's "Pairing Requests" menu and approving it once; `npm start` will be waiting until you do. Every run after that reuses the same approval and prints straight away.
