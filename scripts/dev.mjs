import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function argFlag(name) {
  return process.argv.includes(name);
}

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...options });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForUrl(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return true;
    } catch {
      // ignore
    }
    await sleep(400);
  }
  return false;
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

function killTree(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } catch {
      // ignore
    }
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

async function main() {
  const backendPort = Number(process.env.BACKEND_PORT || 8000);
  const frontendPort = Number(process.env.FRONTEND_PORT || 3000);
  const open = !argFlag("--no-open");
  const forceInstall = argFlag("--force-install");

  const backendDir = path.join(repoRoot, "backend");
  const frontendDir = path.join(repoRoot, "frontend");
  const venvDir = path.join(repoRoot, ".venv");

  const backendReq = path.join(backendDir, "requirements.txt");
  const backendHashFile = path.join(venvDir, ".requirements.sha256");
  const frontendLock = path.join(frontendDir, "package-lock.json");
  const frontendNodeModules = path.join(frontendDir, "node_modules");
  const frontendHashFile = path.join(frontendNodeModules, ".package-lock.sha256");

  if (!fs.existsSync(backendDir)) throw new Error(`Missing folder: ${backendDir}`);
  if (!fs.existsSync(frontendDir)) throw new Error(`Missing folder: ${frontendDir}`);

  // --- Backend setup ---
  if (!fs.existsSync(venvDir)) {
    console.log("[dev] Creating venv...");
    run("python", ["-m", "venv", venvDir], { cwd: repoRoot });
  }

  const venvPythonWin = path.join(venvDir, "Scripts", "python.exe");
  const venvPythonPosix = path.join(venvDir, "bin", "python");
  const pythonExe = fs.existsSync(venvPythonWin)
    ? venvPythonWin
    : fs.existsSync(venvPythonPosix)
      ? venvPythonPosix
      : "python";

  const reqHash = sha256File(backendReq) || "";
  const prevReqHash = fs.existsSync(backendHashFile)
    ? fs.readFileSync(backendHashFile, "utf8").trim()
    : "";

  if (forceInstall || !prevReqHash || prevReqHash !== reqHash) {
    console.log("[dev] Installing backend dependencies...");
    run(pythonExe, ["-m", "pip", "install", "--upgrade", "pip"], { cwd: repoRoot });
    run(pythonExe, ["-m", "pip", "install", "-r", backendReq], { cwd: repoRoot });
    ensureDir(venvDir);
    fs.writeFileSync(backendHashFile, reqHash);
  }

  // --- Frontend setup ---
  if (!fs.existsSync(frontendNodeModules)) {
    console.log("[dev] Installing frontend dependencies...");
    if (fs.existsSync(frontendLock)) run("npm", ["ci"], { cwd: frontendDir });
    else run("npm", ["install"], { cwd: frontendDir });
    const lockHash = sha256File(frontendLock) || "";
    if (lockHash) {
      ensureDir(frontendNodeModules);
      fs.writeFileSync(frontendHashFile, lockHash);
    }
  } else if (fs.existsSync(frontendLock)) {
    const lockHash = sha256File(frontendLock) || "";
    const prevLockHash = fs.existsSync(frontendHashFile)
      ? fs.readFileSync(frontendHashFile, "utf8").trim()
      : "";
    if (forceInstall || (lockHash && lockHash !== prevLockHash)) {
      console.log("[dev] Re-installing frontend deps (lockfile changed)...");
      run("npm", ["ci"], { cwd: frontendDir });
      ensureDir(frontendNodeModules);
      fs.writeFileSync(frontendHashFile, lockHash);
    }
  }

  // --- Start processes ---
  console.log(`[dev] Starting backend on :${backendPort}...`);
  const backend = spawn(pythonExe, ["app.py"], {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, PORT: String(backendPort), PYTHONUNBUFFERED: "1" }
  });

  console.log(`[dev] Starting frontend on :${frontendPort}...`);
  const frontend = spawn("npm", ["run", "dev"], {
    cwd: frontendDir,
    stdio: "inherit",
    env: { ...process.env, PORT: String(frontendPort) }
  });

  const cleanup = () => {
    killTree(frontend);
    killTree(backend);
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
  process.on("exit", cleanup);

  // Auto-open browser when frontend responds
  if (open) {
    const url = `http://localhost:${frontendPort}/`;
    const ok = await waitForUrl(url, 60000);
    if (ok) openInBrowser(url);
    else console.warn(`[dev] Frontend not reachable yet; skipping open (${url}).`);
  }

  const exitCode = await new Promise((resolve) => {
    const done = (code) => resolve(typeof code === "number" ? code : 1);
    backend.on("exit", done);
    frontend.on("exit", done);
  });
  cleanup();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[dev] Failed:", err?.message || err);
  process.exit(1);
});
