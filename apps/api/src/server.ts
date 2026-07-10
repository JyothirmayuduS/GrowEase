import { createApp } from "./app";
import { getEnv } from "./config/env";
import { logger } from "./config/logger";

async function main() {
  const env = getEnv();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "groweasy_api_listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "graceful_shutdown_start");
    server.close((err) => {
      if (err) {
        logger.error({ err }, "shutdown_error");
        process.exit(1);
      }
      logger.info("graceful_shutdown_complete");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason: String(reason) }, "unhandled_rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error({ err: { name: err.name, message: err.message } }, "uncaught_exception");
    shutdown("uncaughtException");
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
