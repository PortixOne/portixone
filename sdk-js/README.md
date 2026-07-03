# @portixone/sdk-js

SDK JavaScript para imprimir desde una web app hacia el Portix Runtime local.

## Quickstart

```js
import { createPortixClient } from '@portixone/sdk-js';

const portix = createPortixClient({
  apiKey: 'dev-local-key', // desde runtime/.data/config.json o tu .env
});

await portix.print({ content: 'Hello from PortixOne' });
const status = await portix.getStatus();
```

`printerName` y `copies` son opcionales en `print()` — se agregan cuando el desarrollador necesita elegir una impresora específica o múltiples copias, sin romper la llamada básica.
