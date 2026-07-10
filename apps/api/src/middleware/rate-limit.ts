import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

import { getEnv } from "../config/env";
import { ErrorCodes } from "../utils/errors";

export function createRateLimiter(): RequestHandler {
  const env = getEnv();
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: ErrorCodes.AI_RATE_LIMIT,
          message: "Too many requests. Please try again later.",
          details: [],
        },
        requestId: req.requestId || "unknown",
      });
    },
  });
}
