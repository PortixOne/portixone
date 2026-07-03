# @portix/sdk

JavaScript SDK for printing from a web app to the local Portix Runtime.

## Quickstart

```bash
npm install @portix/sdk
```

```js
import { Portix } from "@portix/sdk";

const portix = new Portix();

await portix.connect();

await portix.print({
    content: "Hello PortixOne!"
});
```

The printer prints. That's it.

`connect()` uses the local-dev defaults (`localhost`, the runtime's default port, and the `dev-local-key` API key from `runtime/.env.example`) unless you override them:

```js
const portix = new Portix({ apiKey: "...", host: "127.0.0.1", port: 17321 });
```

`printerName` and `copies` are optional on `print()` — they're there for when a developer needs to pick a specific printer or multiple copies, without breaking the basic call.
