#!/usr/bin/env bash
# Ship a commit of this repo (default: main) to the hackathon VPS, rebuild Nakama there and wait for it to be healthy.
#   deploy/redeploy.sh            # deploys main
#   deploy/redeploy.sh <ref>      # deploys any commit or branch
# Only committed code goes out (git archive): uncommitted edits, .env and data/ never leave the Mac.
# The server keeps its own /opt/hk/nakama/.env (mode 600); this script never copies, reads or prints it.
# The previous tree stays in /opt/hk/nakama/app.prev; the build log is /opt/hk/nakama-build.log on the server.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
REF="${1:-main}"
HOST="root@201.18.198.162"
URL="https://nakama.201-18-198-162.sslip.io"
SSH=(ssh -i "$HOME/.ssh/hackathon_vps" -o ConnectTimeout=15 "$HOST")
SHA="$(git -C "$REPO" rev-parse --short "$REF")"
echo "== shipping $REF ($SHA)"
git -C "$REPO" archive --format=tar "$REF" | gzip | "${SSH[@]}" "set -e; rm -rf /opt/hk/nakama/app.new; mkdir -p /opt/hk/nakama/app.new; tar -xzf - -C /opt/hk/nakama/app.new; echo $SHA > /opt/hk/nakama/app.new/DEPLOYED_COMMIT"
echo "== building on the server (waits for /opt/hk/.build.lock, one build at a time)"
"${SSH[@]}" "set -e; cd /opt/hk/nakama
  test -f .env || { echo 'Setup required: /opt/hk/nakama/.env is missing (copy it from the Mac without the DEMO_MEMBER_* keys, chmod 600; see grokbot/HOSTING.md)'; exit 1; }
  rm -rf app.prev; if [ -d app ]; then mv app app.prev; fi; mv app.new app; cd app
  echo \"--- \$(date -u +%FT%TZ) $SHA\" >> /opt/hk/nakama-build.log
  if ! flock /opt/hk/.build.lock docker compose -f deploy/docker-compose.yml up -d --build >> /opt/hk/nakama-build.log 2>&1; then
    echo 'build or start failed; last lines of /opt/hk/nakama-build.log:'; tail -40 /opt/hk/nakama-build.log; exit 1; fi"
echo "== waiting for $URL/api/health"
for i in $(seq 1 60); do
  if curl -fs -o /dev/null "$URL/api/health"; then break; fi
  if [ "$i" = 60 ]; then echo "not healthy after 5 minutes; check: docker logs nakama-server-1 on the server"; exit 1; fi
  sleep 5
done
echo "== healthy; /api/status:"
curl -fsS --max-time 60 "$URL/api/status" | python3 -c 'import json,sys; s=json.load(sys.stdin); print(json.dumps({k:s.get(k) for k in ["rpc","memoryNetwork","memoryConfigured","mainnetWrites","setup"]},indent=1))'
echo "== deployed $SHA to $URL"
