#!/usr/bin/env bash
# Create + link a GrowEasy Supabase project and push migrations.
# Usage:
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   ./scripts/supabase-create.sh
#
# Optional overrides:
#   PROJECT_NAME=groweasy-importer
#   REGION=ap-south-1
#   DB_PASSWORD='your-strong-password'

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN"
  echo "1. Open https://supabase.com/dashboard/account/tokens"
  echo "2. Generate a token"
  echo "3. export SUPABASE_ACCESS_TOKEN=sbp_..."
  echo "4. Re-run: ./scripts/supabase-create.sh"
  exit 1
fi

PROJECT_NAME="${PROJECT_NAME:-groweasy-importer}"
REGION="${REGION:-ap-south-1}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"

echo "==> Listing organizations"
ORG_ID="$(supabase orgs list -o json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if d else "")')"
if [[ -z "$ORG_ID" ]]; then
  echo "No organization found. Create one at https://supabase.com/dashboard or:"
  echo "  supabase orgs create GrowEasy"
  exit 1
fi
echo "Using org: $ORG_ID"

echo "==> Creating project: $PROJECT_NAME ($REGION)"
CREATE_OUT="$(supabase projects create "$PROJECT_NAME" \
  --org-id "$ORG_ID" \
  --db-password "$DB_PASSWORD" \
  --region "$REGION" \
  -o json 2>&1)" || {
  echo "$CREATE_OUT"
  exit 1
}
echo "$CREATE_OUT"

PROJECT_REF="$(echo "$CREATE_OUT" | python3 -c 'import sys,json,re; t=sys.stdin.read();
try:
  d=json.loads(t); print(d.get("id") or d.get("ref") or "")
except Exception:
  m=re.search(r"[a-z]{20}", t); print(m.group(0) if m else "")')"

if [[ -z "$PROJECT_REF" ]]; then
  echo "Could not parse project ref from create output. Listing projects..."
  supabase projects list
  echo "Then run: supabase link --project-ref <ref>"
  echo "DB password (save this): $DB_PASSWORD"
  exit 1
fi

echo "==> Project ref: $PROJECT_REF"
echo "==> Linking local supabase/ to remote"
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD" --yes

echo "==> Pushing migrations"
supabase db push --yes

echo "==> Fetching API keys"
KEYS_JSON="$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json)"
ANON="$(echo "$KEYS_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin);
print(next((k.get("api_key") or k.get("key") or "" for k in d if (k.get("name") or k.get("id") or "").lower() in ("anon","anonymous")), ""))')"
SERVICE="$(echo "$KEYS_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin);
print(next((k.get("api_key") or k.get("key") or "" for k in d if "service" in (k.get("name") or k.get("id") or "").lower()), ""))')"

API_DIR="$ROOT/apps/api"
ENV_FILE="$API_DIR/.env"
mkdir -p "$API_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$API_DIR/.env.example" "$ENV_FILE"
fi

python3 - <<PY
from pathlib import Path
env_path = Path("$ENV_FILE")
text = env_path.read_text() if env_path.exists() else ""
updates = {
  "SUPABASE_URL": f"https://$PROJECT_REF.supabase.co",
  "SUPABASE_ANON_KEY": """$ANON""",
  "SUPABASE_SERVICE_ROLE_KEY": """$SERVICE""",
}
lines = text.splitlines()
seen = set()
out = []
for line in lines:
  if "=" in line and not line.strip().startswith("#"):
    k = line.split("=",1)[0].strip()
    if k in updates:
      out.append(f"{k}={updates[k]}")
      seen.add(k)
      continue
  out.append(line)
for k,v in updates.items():
  if k not in seen:
    out.append(f"{k}={v}")
env_path.write_text("\\n".join(out).rstrip()+"\\n")
print(f"Updated {env_path}")
PY

echo ""
echo "Done."
echo "  Project:  https://supabase.com/dashboard/project/$PROJECT_REF"
echo "  API URL:  https://$PROJECT_REF.supabase.co"
echo "  DB pass:  $DB_PASSWORD   (save securely — shown once)"
echo "  Env:      apps/api/.env"
echo ""
echo "Start API:  cd apps/api && npm run dev"
