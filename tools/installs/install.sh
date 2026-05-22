#!/bin/bash
[ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

curl -s -X POST http://localhost:10850/api/v1/apps/install \
  -H "X-Api-Key: $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"local_path\": \"${APP_DIR}\",
    \"env_vars\": {
      \"DB_PASSWORD\": \"${DB_PASSWORD}\"
    }
  }" | jq
