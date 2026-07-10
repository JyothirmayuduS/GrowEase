# GrowEasy AI Importer — Backend API

Express + TypeScript backend for CSV lead import with AI mapping, Supabase Auth/Postgres/RLS, and Google Drive / Outlook / OneDrive integrations.

> UI is out of scope for this package. This is `apps/api` only.

## Architecture

```
Client (Bearer JWT)
   │
   ▼
Express API (Helmet, CORS, rate limit, request IDs)
   │
   ├─ Auth middleware → Supabase Auth getUser(jwt)
   ├─ ImportPipelineService → CSV parse → AI map/extract → validate → batches → DB
   ├─ Google Drive / Microsoft Graph integrations (encrypted tokens)
   └─ Supabase Postgres (service role server-side; RLS for user JWTs)
```

Layers:

- `controllers` — HTTP adapters
- `services` — business logic (import, AI, validation, encryption)
- `repositories` — Supabase data access
- `integrations` — OAuth + provider APIs
- `middleware` — auth, errors, rate limits

## Database

Migration: `supabase/migrations/20260710000000_groweasy_importer_schema.sql`

Tables: `profiles`, `import_jobs`, `crm_leads`, `skipped_records`, `field_mappings`, `import_batches`, `integrations`, `oauth_states`, `audit_logs`

RLS is enabled on all user-owned tables. Users can only read/write their own rows. The API uses the **service role** for trusted server operations and never exposes that key to browsers.

### Apply migrations

```bash
# Option A — Supabase CLI
supabase link --project-ref <ref>
supabase db push

# Option B — Dashboard → SQL → paste migration file
```

## Local setup

```bash
cd apps/api
cp .env.example .env
# fill SUPABASE_*, TOKEN_ENCRYPTION_KEY, OAUTH_STATE_SECRET, AI keys
npm install
npm run dev
```

Generate secrets:

```bash
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # OAUTH_STATE_SECRET
```

Health:

- `GET /health`
- `GET /ready` (env + DB)

## Environment

See `.env.example` for the full list (Supabase, AI, Google, Microsoft, security, limits).

## Auth

Protected routes require:

```http
Authorization: Bearer <supabase_access_token>
```

Invalid/missing tokens → `401` with `AUTH_REQUIRED` / `INVALID_TOKEN` / `TOKEN_EXPIRED`.

## Import workflow

1. `POST /api/imports/preview` (multipart `file`) — parse + AI mappings
2. Optional mapping edits — `PATCH /api/imports/:jobId/mappings`
3. `POST /api/imports` — full pipeline
4. Progress — `GET /api/imports/:jobId/progress`
5. Downloads — `/download/csv|json|skipped`

All sources (manual, Drive, Outlook, OneDrive) call `ImportPipelineService` after the file bytes are retrieved.

### AI providers

`AI_PROVIDER=openai|gemini` with Zod-validated JSON. Falls back to heuristic mapping if no API key is set.

Batch size: `AI_BATCH_SIZE` (default 25), retries: `AI_MAX_RETRIES` (default 3), idempotency key: `{jobId}:{batchNumber}`.

## API routes

### Imports

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/imports/preview` | yes |
| POST | `/api/imports` | yes |
| GET | `/api/imports` | yes |
| GET | `/api/imports/:jobId` | yes |
| GET | `/api/imports/:jobId/progress` | yes |
| POST | `/api/imports/:jobId/cancel` | yes |
| POST | `/api/imports/:jobId/retry` | yes |
| DELETE | `/api/imports/:jobId` | yes |
| GET/PATCH | `/api/imports/:jobId/mappings` | yes |
| POST | `/api/imports/:jobId/confirm-mappings` | yes |
| GET | `/api/imports/:jobId/validation` | yes |
| POST | `/api/imports/:jobId/continue` | yes |
| GET | `/api/imports/:jobId/download/{csv,json,skipped}` | yes |

### Google Drive

| Method | Path |
|--------|------|
| GET | `/api/integrations/google-drive/connect` |
| GET | `/api/integrations/google-drive/callback` |
| GET | `/api/integrations/google-drive/status` |
| GET | `/api/integrations/google-drive/files` |
| POST | `/api/integrations/google-drive/import` `{ "fileId" }` |
| POST | `/api/integrations/google-drive/disconnect` |

Scope: `drive.file` (+ openid email profile). Tokens encrypted AES-256-GCM in `integrations`.

### Outlook

| Method | Path |
|--------|------|
| GET | `/api/integrations/outlook/connect` |
| GET | `/api/integrations/outlook/callback` |
| GET | `/api/integrations/outlook/status` |
| GET | `/api/integrations/outlook/messages` |
| GET | `/api/integrations/outlook/messages/:messageId/attachments` |
| POST | `/api/integrations/outlook/import-attachment` |
| POST | `/api/integrations/outlook/disconnect` |

Scopes: `User.Read Mail.Read offline_access` (+ OIDC). PKCE enabled.

### OneDrive

| Method | Path |
|--------|------|
| GET | `/api/integrations/onedrive/connect` |
| GET | `/api/integrations/onedrive/callback` |
| GET | `/api/integrations/onedrive/status` |
| GET | `/api/integrations/onedrive/files` |
| POST | `/api/integrations/onedrive/import` `{ "fileId" }` |
| POST | `/api/integrations/onedrive/disconnect` |

Scopes: `User.Read Files.Read offline_access` (+ OIDC).

## OAuth setup

### Google Drive

1. Google Cloud → enable Drive API
2. OAuth Web client
3. Redirect: `http://localhost:4000/api/integrations/google-drive/callback` (+ production URL)
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`

### Microsoft Outlook / OneDrive

1. Entra → App registration (any org + personal)
2. Web redirect URIs for outlook + onedrive callbacks
3. Client secret
4. Graph delegated permissions: `User.Read`, `Mail.Read` (Outlook), `Files.Read` (OneDrive), `offline_access`
5. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, redirect URIs, `MICROSOFT_TENANT_ID=common`

## Error format

```json
{
  "success": false,
  "error": { "code": "INVALID_CSV", "message": "...", "details": [] },
  "requestId": "..."
}
```

Typed codes live in `src/utils/errors.ts` (`ErrorCodes`).

## Security decisions

- Service role only on server
- RLS for direct Supabase client access
- Encrypted OAuth tokens (AES-256-GCM, versioned payload)
- Hashed OAuth states with expiry + single use
- PKCE for Microsoft
- Pino redaction; no CSV row / token logging
- CSV formula-injection prefix on export
- Helmet + CORS allowlist + rate limit

## Tests

```bash
cd apps/api
npm test
```

Unit coverage: CSV parse, validators, encryption, heuristic AI, PKCE, duplicate/skip rules.

## Deployment (Railway / Render)

1. Create Supabase project; run migration
2. Set all env vars from `.env.example`
3. Deploy `apps/api` with Dockerfile or `npm run build && npm start`
4. Health check path: `/health`
5. Set `FRONTEND_URL` / `BACKEND_URL` / `CORS_ALLOWED_ORIGINS` to production origins
6. Register production OAuth redirect URIs

```bash
docker build -t groweasy-api .
docker run --env-file .env -p 4000:4000 groweasy-api
```

## Known limitations

- Full import currently processes synchronously in the request (suitable for moderate CSVs; move to a queue/worker for very large files)
- Google Ads is not part of this API package (Drive/Outlook/OneDrive only)
- Heuristic AI fallback is lower quality than OpenAI/Gemini
- `continue` / `retry` require re-uploading the CSV (file bytes are not stored long-term by default)

## License

Private — GrowEasy
