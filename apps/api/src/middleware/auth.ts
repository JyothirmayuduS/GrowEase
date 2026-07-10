import type { NextFunction, Request, Response } from "express";

import { getAnonClient } from "../config/supabase";
import { AuthenticationError, ErrorCodes } from "../utils/errors";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization") || req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new AuthenticationError("Missing Bearer token", ErrorCodes.AUTH_REQUIRED);
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw new AuthenticationError("Missing Bearer token", ErrorCodes.AUTH_REQUIRED);
    }

    const { data, error } = await getAnonClient().auth.getUser(token);
    if (error || !data.user) {
      const msg = error?.message || "Invalid token";
      const code = /expired/i.test(msg) ? ErrorCodes.TOKEN_EXPIRED : ErrorCodes.INVALID_TOKEN;
      throw new AuthenticationError(msg, code);
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email ?? undefined;
    next();
  } catch (err) {
    next(err);
  }
}
