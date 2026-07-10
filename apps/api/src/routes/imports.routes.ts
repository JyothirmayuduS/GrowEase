import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import * as c from "../controllers/imports.controller";

export const importsRouter = Router();

importsRouter.post("/preview", requireAuth, c.uploadCsv, c.previewImport);
importsRouter.post("/", requireAuth, c.uploadCsv, c.createImport);
importsRouter.get("/", requireAuth, c.listImports);
importsRouter.get("/:jobId", requireAuth, c.getImport);
importsRouter.get("/:jobId/progress", requireAuth, c.getImportProgress);
importsRouter.post("/:jobId/cancel", requireAuth, c.cancelImport);
importsRouter.post("/:jobId/retry", requireAuth, c.uploadCsv, c.retryImport);
importsRouter.delete("/:jobId", requireAuth, c.removeImport);

importsRouter.get("/:jobId/mappings", requireAuth, c.getMappings);
importsRouter.patch("/:jobId/mappings", requireAuth, c.patchMappings);
importsRouter.post("/:jobId/confirm-mappings", requireAuth, c.confirmMappings);

importsRouter.get("/:jobId/validation", requireAuth, c.getValidation);
importsRouter.post("/:jobId/continue", requireAuth, c.uploadCsv, c.continueImport);

importsRouter.get("/:jobId/download/csv", requireAuth, c.downloadCsv);
importsRouter.get("/:jobId/download/json", requireAuth, c.downloadJson);
importsRouter.get("/:jobId/download/skipped", requireAuth, c.downloadSkipped);
