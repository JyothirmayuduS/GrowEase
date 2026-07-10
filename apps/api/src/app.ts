import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { corsOrigins } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { createRateLimiter } from "./middleware/rate-limit";
import { requestIdMiddleware } from "./middleware/request-id";
import { healthRouter } from "./routes/health.routes";
import { importsRouter } from "./routes/imports.routes";
import { integrationsRouter } from "./routes/integrations.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = corsOrigins();
        if (!origin || allowed.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: (req as express.Request).requestId }),
      serializers: {
        req(req) {
          return { method: req.method, url: req.url };
        },
      },
    })
  );
  app.use(createRateLimiter());

  app.use(healthRouter);
  app.use("/api/imports", importsRouter);
  app.use("/api/integrations", integrationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
