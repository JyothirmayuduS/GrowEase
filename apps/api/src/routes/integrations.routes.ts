import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import * as c from "../controllers/integrations.controller";

export const integrationsRouter = Router();

// Google Drive
integrationsRouter.get("/google-drive/connect", requireAuth, c.gdConnect);
integrationsRouter.get("/google-drive/callback", c.gdCallback);
integrationsRouter.get("/google-drive/status", requireAuth, c.gdStatus);
integrationsRouter.get("/google-drive/files", requireAuth, c.gdFiles);
integrationsRouter.post("/google-drive/import", requireAuth, c.gdImport);
integrationsRouter.post("/google-drive/disconnect", requireAuth, c.gdDisconnect);

// Outlook
integrationsRouter.get("/outlook/connect", requireAuth, c.outlookConnect);
integrationsRouter.get("/outlook/callback", c.outlookCallback);
integrationsRouter.get("/outlook/status", requireAuth, c.outlookStatus);
integrationsRouter.get("/outlook/messages", requireAuth, c.outlookMessages);
integrationsRouter.get(
  "/outlook/messages/:messageId/attachments",
  requireAuth,
  c.outlookAttachments
);
integrationsRouter.post("/outlook/import-attachment", requireAuth, c.outlookImport);
integrationsRouter.post("/outlook/disconnect", requireAuth, c.outlookDisconnect);

// OneDrive
integrationsRouter.get("/onedrive/connect", requireAuth, c.odConnect);
integrationsRouter.get("/onedrive/callback", c.odCallback);
integrationsRouter.get("/onedrive/status", requireAuth, c.odStatus);
integrationsRouter.get("/onedrive/files", requireAuth, c.odFiles);
integrationsRouter.post("/onedrive/import", requireAuth, c.odImport);
integrationsRouter.post("/onedrive/disconnect", requireAuth, c.odDisconnect);
