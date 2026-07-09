#!/usr/bin/env node
/**
 * Stable dev — Turbopack only (avoids webpack HMR "reading 'call'" crashes).
 */
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = process.env.PORT ?? "3000";

function run(command, options = {}) {
  execSync(command, { cwd: root, stdio: "inherit", ...options });
}

try {
  run(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
} catch {
  // Port already free
}

process.chdir(root);

console.log(`\n🚀 Starting Turbopack dev on http://localhost:${port}\n`);

const child = spawn("npx", ["next", "dev", "--turbopack", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_DISABLE_DEVTOOLS: "1",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
