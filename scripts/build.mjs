#!/usr/bin/env node
/** Run production build without corrupting an active dev server's .next cache */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? "3000";

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

try {
  run(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
} catch {
  // no dev server
}

run("npx next build");
