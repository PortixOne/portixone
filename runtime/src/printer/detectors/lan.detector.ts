import { networkInterfaces } from 'node:os';
import { Socket } from 'node:net';
import type { PrinterInfo } from '@portixone/protocol';
import { DEFAULT_NETWORK_PRINTER_PORT } from '@portixone/shared';

/** How long to wait for a TCP handshake before assuming nothing's there. */
const PROBE_TIMEOUT_MS = 300;
/** Caps how many sockets are open at once during a subnet sweep. */
const MAX_CONCURRENT_PROBES = 64;

/**
 * Local IPv4 /24 subnets this machine is on — covers the common home/small
 * business LAN case. A real subnet-mask-aware scan (for non-/24 networks) is
 * a follow-up if this proves too narrow; not worth the complexity until it's
 * actually blocked something.
 */
function localSubnets(): string[] {
  const nets = networkInterfaces();
  const subnets = new Set<string>();
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        const [a, b, c] = entry.address.split('.');
        subnets.add(`${a}.${b}.${c}`);
      }
    }
  }
  return [...subnets];
}

function probe(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;
    const finish = (result: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host, () => finish(true));
  });
}

async function probeInBatches(hosts: string[], port: number): Promise<string[]> {
  const found: string[] = [];
  for (let i = 0; i < hosts.length; i += MAX_CONCURRENT_PROBES) {
    const batch = hosts.slice(i, i + MAX_CONCURRENT_PROBES);
    const results = await Promise.all(
      batch.map(async (host) => ((await probe(host, port)) ? host : undefined)),
    );
    found.push(...results.filter((host): host is string => host !== undefined));
  }
  return found;
}

/**
 * Scans this machine's local /24 subnet(s) for anything answering on the raw
 * ESC/POS print port (9100 by default — the same port `network.driver.ts`
 * already sends to, just manually configured today via
 * `PORTIX_NETWORK_PRINTER_HOST`). A responsive host doesn't *prove* it's a
 * printer — it just means something is listening on that port — so results
 * are surfaced as a real possibility, not a confirmed device, same honesty
 * standard as the rest of this discovery layer.
 *
 * This is discovery only: finding a LAN printer here doesn't automatically
 * make it printable — printing to it today still means configuring it as
 * `PORTIX_NETWORK_PRINTER_HOST`, the same manual step Windows-installed
 * printers already need as `defaultPrinter`/`printerName`.
 */
export async function detectLanPrinters(port: number = DEFAULT_NETWORK_PRINTER_PORT): Promise<PrinterInfo[]> {
  const subnets = localSubnets();
  if (subnets.length === 0) {
    return [];
  }
  const hosts = subnets.flatMap((subnet) => Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`));
  const found = await probeInBatches(hosts, port);
  return found.map((host) => ({
    name: `Network printer @ ${host}:${port}`,
    port: `${host}:${port}`,
    online: true,
  }));
}
