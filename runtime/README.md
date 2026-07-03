# Portix Runtime

Bridge local headless (Node.js + TypeScript). Escucha en `localhost:<puerto>` (ver `.env.example`), acepta print jobs vía HTTP y reporta estado en tiempo real vía WebSocket.

## Correr en desarrollo

```bash
npm run dev
```

Primer arranque genera `.data/config.json` con un `apiKey` local autogenerado (o toma `PORTIX_LOCAL_API_KEY` del entorno) y `.data/runtime.log`. Ambos están gitignored.

## Endpoints

- `GET /health` → estado del bridge
- `POST /print` → requiere header `x-portix-api-key`, body `{ content, printerName?, copies? }`
- WebSocket (misma raíz) → eventos `status`, `job:queued`, `job:printed`, `job:error`

## Estado de los módulos

Todo lo listado en `src/` está implementado para el flujo MVP (impresión Windows vía SDK JS). `printer/drivers/mock.driver.ts` loguea el job como impreso — la integración real con ESC/POS (`packages/escpos`) y el spooler de Windows es la próxima iteración.

**Capability managers futuros** (no implementados, ni como carpetas vacías, por diseño — prohibidos en los primeros 90 días): USB Manager, Bluetooth Manager, TCP Manager, Serial Manager, Driver Registry, Updater. Se agregan cuando el roadmap llegue a cajón/básculas/otros dispositivos.
