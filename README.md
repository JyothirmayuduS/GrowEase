# GrowEasy AI CSV Importer

AI-powered CSV importer that intelligently maps arbitrary CSV formats into GrowEasy CRM lead records using OpenAI.

**Live demo:** Deploy to Vercel (see [Deployment](#deployment))  
**Repository:** https://github.com/JyothirmayuduS/GrowEase

## Features

### Core (Assignment Requirements)

- **Step 1 — Upload:** Drag & drop or file picker for any valid CSV
- **Step 2 — Preview:** Parse and preview raw CSV rows (no AI yet) in a scrollable table with sticky headers
- **Step 3 — Confirm Import:** User confirms before any AI processing
- **Step 4 — Results:** AI-mapped CRM records with imported/skipped stats
- **Backend API:** `POST /api/import` with batch OpenAI extraction and NDJSON progress streaming
- **CRM schema:** All 14 GrowEasy fields with validation rules from the assignment

### Bonus

- Drag & drop upload
- 3D cube progress loader during AI import
- Incremental CSV parsing (PapaParse `step`)
- Retry mechanism for failed AI batches (3 attempts)
- Virtualized tables (`@tanstack/react-virtual`) for large files
- Dark mode toggle
- Unit tests (Vitest)
- Docker + docker-compose
- Vercel-ready deployment

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Route Handlers (Node.js) |
| AI | OpenAI GPT-4o-mini or Anthropic Claude (configurable) |
| CSV | PapaParse |
| Tables | TanStack Virtual |

## Getting Started

### Prerequisites

- Node.js 20+
- **Anthropic API key** or **OpenAI API key**

### Setup

```bash
git clone https://github.com/JyothirmayuduS/GrowEase.git
cd GrowEase   # or crm
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Dev Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Turbopack dev server (recommended) |
| `npm run dev:stable` | Production build + start (most stable) |
| `npm run dev:reset` | Clear cache and restart dev |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |

## Environment Variables

```env
# Provider: anthropic (default if ANTHROPIC_API_KEY set) or openai
AI_PROVIDER=anthropic

# Anthropic (Claude) — recommended
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest

# OpenAI (alternative)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## API

### `POST /api/import`

Accepts parsed CSV data, runs AI extraction in batches, streams NDJSON progress events.

**Request:**
```json
{
  "fileName": "leads.csv",
  "headers": ["name", "email", "phone"],
  "rows": [{ "name": "John", "email": "john@example.com", "phone": "9876543210" }]
}
```

**Stream events:**
```json
{ "type": "progress", "percent": 45, "status": "Sending AI Batch 1", "batch": 2, "totalBatches": 5 }
{ "type": "complete", "data": { "imported": [...], "skipped": [...], "totals": { "imported": 8, "skipped": 2, "total": 10 } } }
{ "type": "error", "message": "..." }
```

### `GET /api/health`

Returns `{ status: "ok", openai: true|false }`

## CRM Fields

| Field | Description |
|-------|-------------|
| `created_at` | Lead creation date |
| `name` | Lead name |
| `email` | Primary email |
| `country_code` | Country code (e.g. +91) |
| `mobile_without_country_code` | Mobile number |
| `company` | Company name |
| `city`, `state`, `country` | Location |
| `lead_owner` | Lead owner |
| `crm_status` | GOOD_LEAD_FOLLOW_UP \| DID_NOT_CONNECT \| BAD_LEAD \| SALE_DONE |
| `crm_note` | Notes, extra emails/phones |
| `data_source` | leads_on_demand \| meridian_tower \| eden_park \| varah_swamy \| sarjapur_plots |
| `possession_time` | Property possession time |
| `description` | Additional description |

## AI Rules

1. Only allowed `crm_status` and `data_source` values
2. `created_at` must be JavaScript `new Date()` parseable
3. First email/phone used; extras go to `crm_note`
4. Records without email AND mobile are skipped
5. Line breaks escaped as `\n` in text fields

## Sample CSV Files

Test files in `public/samples/`:

- `facebook-leads.csv` — Facebook-style column names
- `google-ads-export.csv` — Google Ads export format

## Testing

```bash
npm run test
```

## Docker

```bash
cp .env.example .env.local   # add OPENAI_API_KEY
docker compose up --build
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add environment variable: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
4. Deploy

### Manual

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/import/route.ts    # AI import API (streaming)
│   ├── api/health/route.ts
│   ├── home-client.tsx        # Main app state machine
│   └── page.tsx
├── components/
│   ├── sections/              # Upload, Preview, Processing, Results
│   ├── features/csv-import/   # Loader, dropzone
│   └── ui/                    # VirtualTable, Button, etc.
└── lib/
    ├── ai/                    # OpenAI prompts, batch extraction, pipeline
    ├── csv/                   # Parse + normalize
    ├── validation/            # CRM record validation
    └── types/                 # CRM + app types
```

## Submission Checklist

- [x] Public GitHub repository
- [ ] Hosted application URL (deploy to Vercel)
- [x] README with setup instructions
- [ ] Email to varun@groweasy.ai with URLs + position applied for

## License

MIT
