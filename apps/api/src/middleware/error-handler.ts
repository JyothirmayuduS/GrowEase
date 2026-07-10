import type { NextFunction, Request, Response } from "express";

import { logger, sanitizeForLog } from "../config/logger";
import { AppError, ErrorCodes } from "../utils/errors";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || "unknown";

  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        details: sanitizeForLog(err.details),
      },
      "handled_error"
    );
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.expose ? err.message : "An unexpected error occurred",
        details: err.expose ? err.details : [],
      },
      requestId,
    });
    return;
  }

  // Multer file size
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      success: false,
      error: {
        code: ErrorCodes.FILE_TOO_LARGE,
        message: "Uploaded file exceeds the maximum allowed size",
        details: [],
      },
      requestId,
    });
    return;
  }

  logger.error(
    {
      requestId,
      err: err instanceof Error ? { name: err.name, message: err.message } : sanitizeForLog(err),
    },
    "unhandled_error"
  );

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "An unexpected error occurred",
      details: [],
    },
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCodes.RESOURCE_NOT_FOUND,
      message: `Route not found: ${req.method} ${req.path}`,
      details: [],
    },
    requestId: req.requestId || "unknown",
  });
}
