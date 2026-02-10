import { spawn } from "node:child_process";
import process from "node:process";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const [key, inlineValue] = token.split("=", 2);
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

async function urlResponds(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    // Any HTTP response means the server is up.
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function openInBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const host = String(process.env.DEV_HOST || args.get("--host") || "localhost");
  const basePath = String(process.env.DEV_PATH || args.get("--path") || "/");

  const startPort = Number(process.env.DEV_PORT || args.get("--port") || 3000);
  const endPort = Number(process.env.DEV_PORT_MAX || args.get("--port-max") || 3010);

  const perProbeTimeoutMs = Number(process.env.DEV_PROBE_TIMEOUT_MS || args.get("--probe-timeout-ms") || 800);
  const overallTimeoutMs = Number(process.env.DEV_TIMEOUT_MS || args.get("--timeout-ms") || 60000);
  const intervalMs = Number(process.env.DEV_INTERVAL_MS || args.get("--interval-ms") || 500);

  const dryRun = Boolean(process.env.DEV_DRY_RUN) || Boolean(args.get("--dry-run"));

  const deadline = Date.now() + overallTimeoutMs;
  let chosenUrl = null;

  while (Date.now() < deadline) {
    for (let port = startPort; port <= endPort; port++) {
      const url = `http://${host}:${port}${basePath}`;
      const ok = await urlResponds(url, perProbeTimeoutMs);
      if (ok) {
        chosenUrl = url;
        break;
      }
    }
    if (chosenUrl) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (!chosenUrl) {
    console.warn(
      `[open-dev] Could not detect dev server on ports ${startPort}-${endPort} within ${overallTimeoutMs}ms; skipping auto-open.`
    );
    return;
  }

  if (dryRun) {
    console.log(`[open-dev] Detected: ${chosenUrl} (dry-run; not opening)`);
    return;
  }

  console.log(`[open-dev] Opening: ${chosenUrl}`);
  openInBrowser(chosenUrl);
}

main().catch((err) => {
  console.warn("[open-dev] Failed:", err?.message || err);
});

