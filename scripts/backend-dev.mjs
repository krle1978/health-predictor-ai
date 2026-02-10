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
  if (!fs.existsSync(filePath)) return "";
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

async function waitForHealth(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const backendPort = Number(process.env.BACKEND_PORT || process.env.PORT || 8000);
  const forceInstall = argFlag("--force-install");

  const backendDir = path.join(repoRoot, "backend");
  const venvDir = path.join(repoRoot, ".venv");
  const backendReq = path.join(backendDir, "requirements.txt");
  const backendHashFile = path.join(venvDir, ".requirements.sha256");

  if (!fs.existsSync(backendDir)) throw new Error(`Missing folder: ${backendDir}`);
  if (!fs.existsSync(backendReq)) throw new Error(`Missing file: ${backendReq}`);

  // Create venv if missing
  if (!fs.existsSync(venvDir)) {
    console.log("[backend] Creating venv...");
    run("python", ["-m", "venv", venvDir], { cwd: repoRoot });
  }

  // Resolve venv python each time (venv may have just been created)
  const venvPythonWin = path.join(venvDir, "Scripts", "python.exe");
  const venvPythonPosix = path.join(venvDir, "bin", "python");
  const pythonExe = fs.existsSync(venvPythonWin)
    ? venvPythonWin
    : fs.existsSync(venvPythonPosix)
      ? venvPythonPosix
      : "python";

  // Install deps when requirements changed
  const reqHash = sha256File(backendReq);
  const prevReqHash = fs.existsSync(backendHashFile)
    ? fs.readFileSync(backendHashFile, "utf8").trim()
    : "";

  if (forceInstall || !prevReqHash || prevReqHash !== reqHash) {
    console.log("[backend] Installing dependencies...");
    run(pythonExe, ["-m", "pip", "install", "--upgrade", "pip"], { cwd: repoRoot });
    run(pythonExe, ["-m", "pip", "install", "-r", backendReq], { cwd: repoRoot });
    ensureDir(venvDir);
    fs.writeFileSync(backendHashFile, reqHash);
  }

  console.log(`[backend] Starting Flask on :${backendPort}...`);
  const backend = spawn(pythonExe, ["app.py"], {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(backendPort),
      PYTHONUNBUFFERED: "1",
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    }
  });

  waitForHealth(`http://127.0.0.1:${backendPort}/health`, 120000).then((ok) => {
    if (ok) console.log(`[backend] Ready: http://127.0.0.1:${backendPort}/health`);
    else console.warn(`[backend] Not ready yet (port ${backendPort}).`);
  });

  const cleanup = () => killTree(backend);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
  process.on("exit", cleanup);

  const exitCode = await new Promise((resolve) => {
    backend.on("exit", (code) => resolve(typeof code === "number" ? code : 1));
  });
  cleanup();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[backend] Failed:", err?.message || err);
  process.exit(1);
});
