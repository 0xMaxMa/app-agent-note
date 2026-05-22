#!/bin/bash
ENV_FILE="$(dirname "$0")/.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

MSG="${1:-hello}"

BODY="{\"message\": \"${MSG}\", \"chat_id\": \"tools\""
[ -n "$SESSION_ID" ] && BODY="${BODY}, \"session_id\": \"${SESSION_ID}\""
BODY="${BODY}}"

URL="http://localhost:10850/api/v1/agents/${AGENT_ID}/messages"

echo "--- DEBUG ---" >&2
echo "URL:      $URL" >&2
echo "AGENT_ID: $AGENT_ID" >&2
echo "API_KEY:  ${GATEWAY_API_KEY:0:8}..." >&2
echo "SESSION:  ${SESSION_ID:-(none)}" >&2
echo "BODY:     $BODY" >&2
echo "-------------" >&2

RESULT=$(curl -s -X POST "$URL" \
  -H "X-Api-Key: $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$BODY")

printf '%s' "$RESULT" | jq .

NEW_SESSION=$(printf '%s' "$RESULT" | jq -r '.session_id // empty')
if [ -n "$NEW_SESSION" ] && [ "$NEW_SESSION" != "$SESSION_ID" ]; then
  if grep -q "^SESSION_ID=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^SESSION_ID=.*|SESSION_ID=$NEW_SESSION|" "$ENV_FILE"
  else
    echo "SESSION_ID=$NEW_SESSION" >> "$ENV_FILE"
  fi
  echo "(session saved: $NEW_SESSION)" >&2
fi
