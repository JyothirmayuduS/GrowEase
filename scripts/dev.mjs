#!/usr/bin/env node
/**
 * Reliable dev bootstrap — always starts from a clean .next to prevent
 * recurring Internal Server Error from Turbopack / build artifact conflicts.
 */
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = process.env.PORT ?? "3000";
const nextDir = path.join(root, ".next");
const useTurbopack = process.env.DEV_TURBOPACK === "1";

function run(command, options = {}) {
  execSync(command, { cwd: root, stdio: "inherit", ...options });
}

function rmSafe(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

/** Full .next wipe every dev start — prevents corrupted cache 500 errors */
function prepareDevCache() {
  rmSafe(nextDir);
  rmSafe(path.join(root, "node_modules", ".cache"));
}

function killPort() {
  try {
    run(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
  } catch {
    // Port already free
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "localhost", port: Number(port), path: "/api/health", timeout: 5000 },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve(res.statusCode === 200 && body.includes('"status":"ok"'));
        });
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealthy(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    await wait(500);
    if (await probeHealth()) return true;
  }
  return false;
}

function startDevServer() {
  const args = ["next", "dev", "-p", port];
  if (useTurbopack) args.splice(2, 0, "--turbopack");

  return spawn("npx", args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_DISABLE_DEVTOOLS: "1" },
  });
}

async function main() {
  killPort();
  prepareDevCache();
  process.chdir(root);

  const mode = useTurbopack ? "Turbopack" : "Webpack";
  console.log(`\n🚀 Starting ${mode} dev on http://localhost:${port} (clean cache)\n`);

  let child = startDevServer();

  const attachChildHandlers = (proc) => {
    proc.on("exit", (code) => process.exit(code ?? 0));
  };

  attachChildHandlers(child);

  await wait(3000);
  const healthy = await waitForHealthy();
  if (!healthy) {
    console.warn("\n⚠️  Server not healthy — restarting once more…\n");
    child.kill("SIGTERM");
    await wait(800);
    killPort();
    prepareDevCache();
    child = startDevServer();
    attachChildHandlers(child);
    const ok = await waitForHealthy();
    if (!ok) {
      console.error("\n❌ Dev server failed to start. Run: npm run dev:reset\n");
    }
  }

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

void main();
