import { Router } from "express";

import { getEnvIssues, isAiConfigured } from "../config/env";
import { pingDatabase } from "../config/supabase";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "groweasy-api",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/ready", async (_req, res) => {
  const envIssues = getEnvIssues();
  let dbOk = false;
  try {
    dbOk = await pingDatabase();
  } catch {
    dbOk = false;
  }

  const ready = envIssues.length === 0 && dbOk;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    checks: {
      env: envIssues.length === 0,
      envIssues,
      database: dbOk,
      aiConfigured: isAiConfigured(),
    },
    timestamp: new Date().toISOString(),
  });
});
