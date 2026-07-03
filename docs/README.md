# Docs

Placeholder — the public-facing docs site is [`portix.dev/docs`](https://github.com/portixhq/portix.dev). Real, deeper content (troubleshooting, driver internals, capability model) is upcoming work per the operating manual.

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

For more:
- SDK reference → [`sdk-js/README.md`](../sdk-js/README.md)
- Running the runtime → [`runtime/README.md`](../runtime/README.md)
