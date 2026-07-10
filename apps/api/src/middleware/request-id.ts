import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

import { getEnv } from "../config/env";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      userId?: string;
      userEmail?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = getEnv().REQUEST_ID_HEADER;
  const incoming = req.header(header);
  const id = incoming && incoming.trim() ? incoming.trim() : randomUUID();
  req.requestId = id;
  res.setHeader(header, id);
  next();
}
