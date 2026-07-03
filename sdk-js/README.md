# @portixone/sdk-js

JavaScript SDK for printing from a web app to the local Portix Runtime.

## Quickstart

```js
import { createPortixClient } from '@portixone/sdk-js';

const portix = createPortixClient({
  apiKey: 'dev-local-key', // from runtime/.data/config.json or your .env
});

await portix.print({ content: 'Hello from PortixOne' });
const status = await portix.getStatus();
```

`printerName` and `copies` are optional on `print()` — they're there for when a developer needs to pick a specific printer or multiple copies, without breaking the basic call.
