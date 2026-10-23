// Captures the 8 design concepts as PNG previews, in REAL time (animations finish).
// Usage: node --experimental-websocket tools/capture-concepts.mjs [baseUrl]   (Node 22+: flag not needed)
// Requires a local static server on the site folder, e.g. python3 -m http.server 4173 --directory site
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://127.0.0.1:4173";
const OUT = fileURLToPath(new URL("../site/concepts/previews/", import.meta.url));
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGES = ["01-signal", "02-brutal", "03-aurora", "04-terminal", "05-suisse", "06-pop", "07-nocturne", "08-carnet"];
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--hide-scrollbars", `--user-data-dir=${mkdtempSync(join(tmpdir(), "rc-cdp-"))}`, "about:blank"], { stdio: "ignore" });

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error("Chrome DevTools endpoint not reachable");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) (pending.get(msg.id))(msg), pending.delete(msg.id);
  });
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const p of PAGES) {
    await send("Page.navigate", { url: `${BASE}/concepts/${p}.html` });
    await sleep(6500); // let reveals, counters and typing finish in real time
    const { result } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, `${p}.png`), Buffer.from(result.data, "base64"));
    console.log("captured", p);
  }
  ws.close();
} finally {
  chrome.kill();
}
