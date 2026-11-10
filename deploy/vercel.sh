#!/usr/bin/env bash
# Deploy the web app to Vercel (project "nakama", production) as a static build that talks to the hosted API.
#   deploy/vercel.sh
# The page calls https://nakama.201-18-198-162.sslip.io/api directly (the server answers CORS *), so Vercel only
# serves files; every path falls back to index.html, which shows the landing page.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
API="${VITE_NAKAMA_API:-https://nakama.201-18-198-162.sslip.io/api}"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
(cd "$REPO/packages/web" && VITE_NAKAMA_API="$API" npx tsc -p tsconfig.json && VITE_NAKAMA_API="$API" npx vite build --outDir "$STAGE/site" --emptyOutDir)
cat > "$STAGE/site/vercel.json" <<'JSON'
{ "rewrites": [{ "source": "/((?!assets/|art/).*)", "destination": "/index.html" }],
  "headers": [{ "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }] }
JSON
cd "$STAGE/site"
vercel link --yes --project nakama >/dev/null
vercel deploy --prod --yes
