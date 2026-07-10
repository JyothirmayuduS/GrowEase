import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { getEnv } from "../config/env";
import {
  disconnectGoogleDrive,
  googleDriveStatus,
  handleGoogleDriveCallback,
  importGoogleDriveFile,
  listGoogleDriveFiles,
  startGoogleDriveConnect,
} from "../integrations/google-drive/google-drive.service";
import {
  disconnectMicrosoft,
  handleMicrosoftCallback,
  importOneDriveFile,
  importOutlookAttachment,
  listOneDriveFiles,
  listOutlookAttachments,
  listOutlookMessages,
  microsoftStatus,
  startMicrosoftConnect,
} from "../integrations/microsoft-outlook/microsoft-graph.service";
import { AuthenticationError, ValidationError } from "../utils/errors";

function requireUser(req: Request): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

function frontendRedirect(path: string, params: Record<string, string>) {
  const url = new URL(path, getEnv().FRONTEND_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

// Google Drive
export async function gdConnect(req: Request, res: Response, next: NextFunction) {
  try {
    const { url } = await startGoogleDriveConnect(requireUser(req));
    res.json({ success: true, data: { url }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function gdCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const error = String(req.query.error || "");
    if (error) {
      return res.redirect(
        frontendRedirect("/settings/integrations", { error, provider: "google_drive" })
      );
    }
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state) throw new ValidationError("Missing code/state");
    await handleGoogleDriveCallback(code, state);
    res.redirect(
      frontendRedirect("/settings/integrations", { connected: "google_drive" })
    );
  } catch (err) {
    next(err);
  }
}

export async function gdStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await googleDriveStatus(requireUser(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function gdFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const files = await listGoogleDriveFiles(requireUser(req));
    res.json({ success: true, data: files, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function gdImport(req: Request, res: Response, next: NextFunction) {
  try {
    const fileId = z.string().min(1).parse(req.body?.fileId);
    const job = await importGoogleDriveFile(requireUser(req), fileId);
    res.status(201).json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function gdDisconnect(req: Request, res: Response, next: NextFunction) {
  try {
    await disconnectGoogleDrive(requireUser(req));
    res.json({ success: true, data: { disconnected: true }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

// Outlook
export async function outlookConnect(req: Request, res: Response, next: NextFunction) {
  try {
    const { url } = await startMicrosoftConnect(requireUser(req), "microsoft_outlook");
    res.json({ success: true, data: { url }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function outlookCallback(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query.error) {
      return res.redirect(
        frontendRedirect("/settings/integrations", {
          error: String(req.query.error),
          provider: "microsoft_outlook",
        })
      );
    }
    await handleMicrosoftCallback(
      "microsoft_outlook",
      String(req.query.code || ""),
      String(req.query.state || "")
    );
    res.redirect(
      frontendRedirect("/settings/integrations", { connected: "microsoft_outlook" })
    );
  } catch (err) {
    next(err);
  }
}

export async function outlookStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await microsoftStatus(requireUser(req), "microsoft_outlook");
    res.json({ success: true, data, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function outlookMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listOutlookMessages(requireUser(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function outlookAttachments(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listOutlookAttachments(
      requireUser(req),
      String(req.params.messageId)
    );
    res.json({ success: true, data, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function outlookImport(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z
      .object({ messageId: z.string().min(1), attachmentId: z.string().min(1) })
      .parse(req.body);
    const job = await importOutlookAttachment(
      requireUser(req),
      body.messageId,
      body.attachmentId
    );
    res.status(201).json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function outlookDisconnect(req: Request, res: Response, next: NextFunction) {
  try {
    await disconnectMicrosoft(requireUser(req), "microsoft_outlook");
    res.json({ success: true, data: { disconnected: true }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

// OneDrive
export async function odConnect(req: Request, res: Response, next: NextFunction) {
  try {
    const { url } = await startMicrosoftConnect(requireUser(req), "onedrive");
    res.json({ success: true, data: { url }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function odCallback(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query.error) {
      return res.redirect(
        frontendRedirect("/settings/integrations", {
          error: String(req.query.error),
          provider: "onedrive",
        })
      );
    }
    await handleMicrosoftCallback(
      "onedrive",
      String(req.query.code || ""),
      String(req.query.state || "")
    );
    res.redirect(frontendRedirect("/settings/integrations", { connected: "onedrive" }));
  } catch (err) {
    next(err);
  }
}

export async function odStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await microsoftStatus(requireUser(req), "onedrive");
    res.json({ success: true, data, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function odFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listOneDriveFiles(requireUser(req));
    res.json({ success: true, data, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function odImport(req: Request, res: Response, next: NextFunction) {
  try {
    const fileId = z.string().min(1).parse(req.body?.fileId);
    const job = await importOneDriveFile(requireUser(req), fileId);
    res.status(201).json({ success: true, data: job, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}

export async function odDisconnect(req: Request, res: Response, next: NextFunction) {
  try {
    await disconnectMicrosoft(requireUser(req), "onedrive");
    res.json({ success: true, data: { disconnected: true }, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
}
