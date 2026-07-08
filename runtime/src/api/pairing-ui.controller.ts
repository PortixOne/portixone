import type { ServerResponse } from 'node:http';

export function handlePairingApprovalUI(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(PAIRING_UI_HTML);
}

// The richer permission-approval surface tracked as Fase 5's "beyond
// today's plain toast" in ROADMAP.md — same self-contained-page pattern as
// dashboard.controller.ts, opened from the tray's Pairing Requests submenu.
// No "remember this app" checkbox: every approval is already permanent
// until revoked (there's no temporary/session-only grant in the backend),
// so a checkbox implying otherwise would be decorative at best, misleading
// at worst — a plain sentence says the same true thing instead.
const PAIRING_UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PortixOne — Pairing Requests</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { font-size: 1.3rem; }
  .muted { opacity: 0.65; font-size: 0.9em; }
  .card { border: 1px solid #8886; border-radius: 10px; padding: 1rem 1.2rem; margin: 1rem 0; }
  .subject { font-size: 1.1rem; font-weight: 600; }
  .code { font-family: ui-monospace, monospace; font-size: 1.4rem; letter-spacing: 0.05em; background: #8882; padding: 0.2rem 0.6rem; border-radius: 6px; display: inline-block; margin: 0.5rem 0; }
  .perms { margin: 0.5rem 0; }
  .perms span { display: inline-block; background: #2f6fed22; border: 1px solid #2f6fed88; color: #2f6fed; border-radius: 999px; padding: 0.1rem 0.7rem; font-size: 0.85em; margin-right: 0.3rem; }
  .actions { margin-top: 0.8rem; display: flex; gap: 0.6rem; }
  button { cursor: pointer; padding: 0.45rem 1.1rem; border-radius: 6px; border: 1px solid #8886; background: transparent; color: inherit; font-size: 0.95em; }
  button.allow { background: #2f6fed; border-color: #2f6fed; color: white; }
  button.deny { border-color: #d0403088; }
  button:disabled { opacity: 0.5; cursor: default; }
</style>
</head>
<body>
  <h1>Pairing Requests</h1>
  <p class="muted">Apps asking for permission to print through this PortixOne Runtime.</p>
  <div id="list"><p class="muted">Loading…</p></div>

<script>
const apiKey = new URLSearchParams(location.search).get('key') || '';

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-portix-api-key': apiKey, ...(options && options.headers) },
  });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((body && body.message) || (res.status + ' ' + res.statusText));
  return body;
}

function displayOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.port ? url.hostname + ':' + url.port : url.hostname;
  } catch {
    return origin;
  }
}

async function refresh() {
  const el = document.getElementById('list');
  let pending;
  try {
    pending = await api('/pairing/pending');
  } catch (error) {
    el.innerHTML = '<p class="muted">Could not load pending requests: ' + error.message + '</p>';
    return;
  }
  if (pending.length === 0) {
    el.innerHTML = '<p class="muted">No pending requests.</p>';
    return;
  }
  el.innerHTML = '';
  for (const request of pending) {
    const subject = request.origin ? displayOrigin(request.origin) : request.appId;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="subject">' + subject + ' wants to print</div>' +
      '<div class="muted">Tenant: ' + request.tenant + '</div>' +
      '<div class="code">' + request.code + '</div>' +
      '<div class="muted">Confirm this matches the code shown in ' + subject + ' before allowing it.</div>' +
      '<div class="perms"><span>Print</span></div>' +
      '<div class="muted">Approving is permanent — manage or revoke access anytime from the tray\\'s Connected Applications menu.</div>' +
      '<div class="actions"><button class="allow">Allow</button><button class="deny">Deny</button></div>';
    const [allowBtn, denyBtn] = card.querySelectorAll('button');
    allowBtn.onclick = async () => {
      allowBtn.disabled = true;
      denyBtn.disabled = true;
      await api('/pairing/approve', { method: 'POST', body: JSON.stringify({ code: request.code }) });
      await refresh();
    };
    denyBtn.onclick = async () => {
      allowBtn.disabled = true;
      denyBtn.disabled = true;
      await api('/pairing/deny', { method: 'POST', body: JSON.stringify({ code: request.code }) });
      await refresh();
    };
    el.appendChild(card);
  }
}

refresh();
setInterval(refresh, 3000);
</script>
</body>
</html>
`;
