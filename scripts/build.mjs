#!/usr/bin/env node
/** Run production build without corrupting an active dev server's .next cache */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? "3000";
const isDocker = process.env.DOCKER_BUILD === "1";

function run(cmd) {
  console.log(`[BUILD STEP] Executing: ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

if (isDocker) {
  console.log("[BUILD] Running inside Docker. Bypassing port cleanup step.");
} else {
  try {
    console.log(`[BUILD] Checking and clearing port ${port}...`);
    run(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
  } catch {
    // no dev server or lsof not available
  }
}

console.log("[BUILD] Starting Next.js production build...");
run("npx next build");
console.log("[BUILD] Next.js build finished successfully.");
