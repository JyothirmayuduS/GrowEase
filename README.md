# GrowEasy AI CSV Lead Importer

Production-style CSV → GrowEasy CRM mapper for Indian real-estate lead gen. Upload any CSV shape (Facebook Lead Ads, Zoho, WhatsApp agent sheets, typo headers), preview raw rows, confirm, then AI-map into the fixed CRM schema.

**Repository:** https://github.com/JyothirmayuduS/GrowEase  
**Live demo:** https://growease.vercel.app  

> Cold-open check: open https://growease.vercel.app/api/health — expect `"status":"ok"` and `"aiConfigured":true` with no setup steps.

## What this is (not a toy parser)

The hard part is **field mapping under messy, unseen headers** — not CSV parsing. The pipeline is built so:

1. **Parse is dumb and safe** — `/api/parse` only validates + Papa-parses (no AI).
2. **Preview is honest** — raw columns, quality flags, no hallucinated CRM fields yet.
3. **Confirm gates AI** — `/api/import` runs only after the user clicks Confirm.
4. **Mapping survives weird input** — prompts + server sanitize + heuristic fallback for Facebook / Zoho / WhatsApp / typo / RE project nicknames.
5. **Deploy is clickable** — Vercel config, long `maxDuration` on import, health probe for cold starts.

## App routes

| Path | Page |
|------|------|
| `/` | Redirects to Dashboard |
| `/dashboard` | Pipeline overview + import history |
| `/lead-sources` | AI CSV importer (upload → preview → results) |
| `/leads` | Manage Leads directory |
| `/leads/generate` | Campaigns / demand gen |
| `/leads/engage` | Outreach queue |
| `/settings/team` | Team members |
| `/settings/crm-fields` | CRM schema & enums |
| `/settings/api` | Health + API docs |
| `/integrations/ads` | Ad accounts |
| `/integrations/whatsapp` | WhatsApp |
| `/integrations/tele-calling` | Tele calling |
| `/business` | Business center |

## Features

- Full sidebar routing with pathname-active nav
- Upload → Preview → Confirm → AI Results (required gating)
- Column-name independence (map by meaning, not header equality)
- Enum synonym normalization (`Hot Lead` → `GOOD_LEAD_FOLLOW_UP`, `LOD` → `leads_on_demand`, …)
- Multi email/phone → first field + extras in `crm_note`
- Skip only when neither email nor mobile exists after sanitize
- NDJSON progress stream; retry + repair prompt; heuristic fallback on quota/key failures
- Virtualized tables, dark mode, Docker, Vitest

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js Route Handlers (Node.js) |
| AI | Anthropic Claude or OpenAI (configurable) |
| CSV | Papa Parse (server + client) |
| Tables | TanStack Virtual |

## Teammate onboarding

```bash
git clone https://github.com/JyothirmayuduS/GrowEase.git
cd GrowEase
npm install
cp .env.example .env.local
# Set ANTHROPIC_API_KEY (preferred) or OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000 — drop a file from `public/samples/`, preview, confirm import.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local app (cleans `.next` via script) |
| `npm run test` | Unit tests (mapping, sanitize, quality) |
| `npm run build && npm start` | Production locally |
| `docker compose up --build` | Containerized run |

### Environment

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
# or
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Without a key, import still runs via **heuristic** header mapping (useful for demos; set a key for evaluation).

## API

### `POST /api/parse` (no AI)

Multipart field `file`. Rejects non-`.csv`, empty, header-only, >5 MB.

### `POST /api/import` (AI after confirm)

JSON `{ fileName, headers, rows }` → NDJSON stream (`progress` / `complete` / `error`). Cap: 2000 rows. `maxDuration` 300s on Vercel.

### `GET /api/health`

```json
{ "status": "ok", "aiConfigured": true, "provider": "anthropic", "timestamp": "..." }
```

Use this as the first check after a cold deploy.

## Flow

1. Upload — client + server validate `.csv` / 5 MB  
2. Preview — raw table + quality strip; **no AI**  
3. Confirm import — button disabled while `/api/import` streams  
4. Results — imported / needs review / skipped  

## AI + validation (evaluation priority)

Prompts explicitly cover Facebook Lead Ads, Zoho exports, WhatsApp sheets, Telugu/English city nicknames (`Hyd`, `Blr`, `Vizag`), and RE project enums (`meridian_tower`, `sarjapur_plots`, …).

Server always:

- blanks invalid `crm_status` / `data_source` (after synonym map)
- blanks unparseable `created_at`
- splits multi-contact into `crm_note`
- escapes newlines as `\n`
- skips only when no email **and** no mobile

If the LLM fails (quota, 429, bad JSON after repair), **heuristic alias + fuzzy typo matching** still produces sanitized CRM rows.

## Sample CSVs (`public/samples/`)

| File | What it stresses |
|------|------------------|
| `facebook-leads.csv` | FB Lead Ads column names, multi-email |
| `google-ads-export.csv` | Ads export shape |
| `zoho-crm-export.csv` | Zoho Lead Name / Lead Status / Lead Source |
| `whatsapp-agent-sheet.csv` | Naam / Mob / Mail id / Hyd / Vizag / project nicknames |
| `typo-headers.csv` | Emial, Phne Number, Soruce, Possesion |
| `real-estate-messy.csv` | WA lists, builder projects, pipeline slang |
| `quoted-fields.csv` | commas/newlines in quotes |
| `header-only.csv` | must 400 from `/api/parse` |

## Deployment (Vercel — cold open)

`vercel.json` sets import `maxDuration` 300, parse 60, no-store on `/api/*`.

1. Push `main` to GitHub  
2. [vercel.com/new](https://vercel.com/new) → import `GrowEase`  
3. Env: `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`), optional `AI_PROVIDER`  
4. Deploy  
5. Verify: `https://YOUR_APP.vercel.app/api/health` then open the root URL and import `whatsapp-agent-sheet.csv`

CLI (if already logged in):

```bash
vercel --prod
# then: vercel env add ANTHROPIC_API_KEY
```

### Docker

```bash
cp .env.example .env.local   # add key
docker compose up --build
```

## Project structure

```
src/
├── app/api/parse|import|health
├── app/home-client.tsx
├── components/sections/          # Upload, Preview, Processing, Results
└── lib/
    ├── ai/prompts.ts             # Column-independence + RE domain
    ├── ai/extract-batch.ts       # Repair, retry, heuristic fallback
    ├── ai/heuristic-extract.ts   # Alias + fuzzy typo mapping
    └── validation/               # Enums, contacts, row quality
public/samples/                   # Adversarial fixtures
vercel.json
```

## Submission checklist

- [x] Public GitHub repository  
- [x] Hosted application URL — https://growease.vercel.app  
- [x] README a teammate can onboard from  
- [ ] Email varun@groweasy.ai with repo URL, hosted URL, and position applied for  

## License

MIT
