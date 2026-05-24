# e2e-workflow: Full Test Workflow for agent-note

End-to-end test covering setup → install → app/API → agent prompts → skills → uninstall.

**Prerequisites:** claude-gateway running locally.

Set these shell variables once at the start — used throughout the steps below:

```bash
# Run from repo root
APP_NAME=$(grep '^name:' app.yaml | awk '{print $2}')
AGENT_NAME=$(grep -A3 '^\s*agent:' app.yaml | grep '^\s*name:' | awk '{print $2}')
```

---

## 1. Environment Setup

### 1.1 App env — `<repo-root>/.env`

Used by the app and DB containers at install time. Create if not exists:

```bash
# Run from repo root
if [ ! -f .env ]; then
  echo "DB_PASSWORD needs to be set."
  printf "Enter DB_PASSWORD (any string, keep it secret): "
  read -r db_pass
  echo "DB_PASSWORD=${db_pass}" > .env
  echo ".env created."
fi
```

> `BASE_PATH` is injected automatically by the gateway at install time. Do not set it manually.

### 1.2 Test env — `tools/tests/.env`

Used by `agent-msg.sh` to connect to the gateway. Create if not exists:

```bash
# Run from repo root
if [ ! -f tools/tests/.env ]; then
  echo ""
  echo "tools/tests/.env needs to be configured."
  echo ""
  printf "GATEWAY_API_KEY  (find it in gateway admin panel or ~/.claude-gateway/config.yaml): "
  read -r api_key
  AGENT_NAME=$(grep -A3 '^\s*agent:' app.yaml | grep '^\s*name:' | awk '{print $2}')
  cat > tools/tests/.env <<EOF
GATEWAY_API_KEY=${api_key}
AGENT_ID=${AGENT_NAME}
SESSION_ID=
EOF
  echo "tools/tests/.env created."
fi
```

**Where to find each value:**

| Variable | Where |
|---|---|
| `GATEWAY_API_KEY` | gateway admin panel > API Keys, or `~/.claude-gateway/config.yaml` |
| `AGENT_ID` | `app.yaml` → `services.agent.name` (auto-read by setup script above) |
| `SESSION_ID` | Leave blank — `agent-msg.sh` fills this automatically after first message |

---

## 2. Uninstall (if exists)

```bash
gateway app uninstall ${APP_NAME} 2>/dev/null || true

# Verify containers are gone
docker ps --filter name=${APP_NAME}
# Expected: empty
```

If you want a clean DB state (no leftover data):

```bash
# Run from repo root
rm -rf postgres/
```

---

## 3. Install

```bash
# Run from repo root
APP_DIR=$(pwd)
DB_PASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d= -f2)

gateway app install --local "$APP_DIR" --env "DB_PASSWORD=${DB_PASSWORD}"
```

**Expected logs:**
- `Symlinked <path> → ~/.claude-gateway/apps/${APP_NAME}`
- `Agent "${AGENT_NAME}" registered`
- `Containers healthy`
- `Install complete: ...`

**Verify symlink and agent registration:**

```bash
# apps/<app-name> must be a symlink pointing to repo root
ls -la ~/.claude-gateway/apps/${APP_NAME}
# Expected: lrwxrwxrwx ... ${APP_NAME} -> /path/to/repo

# agents/<agent-name> must exist as a directory
ls ~/.claude-gateway/agents/${AGENT_NAME}
# Expected: directory listing (AGENTS.md, skills/, etc.)
```

**Verify containers:**

```bash
docker ps --filter name=${APP_NAME}
# Expected: ${APP_NAME}-app (healthy), ${APP_NAME}-db (healthy), ${APP_NAME}-agent (up)
```

---

## 4. App / API Tests

Run from inside the agent container (uses docker-compose DNS `app`):

```bash
BASE_PATH=$(docker exec ${APP_NAME}-agent printenv BASE_PATH)
```

### 4.1 Health check

```bash
docker exec ${APP_NAME}-agent curl -si "http://app:4000${BASE_PATH}/api/health"
# Expected: HTTP 200
```

### 4.2 List notes

```bash
docker exec ${APP_NAME}-agent curl -s "http://app:4000${BASE_PATH}/api/notes"
# Expected: JSON array (empty [] only on a fresh DB with no prior data)
```

### 4.3 Save a note

```bash
NOTE_ID=$(docker exec ${APP_NAME}-agent curl -s -X POST "http://app:4000${BASE_PATH}/api/notes" \
  -H "Content-Type: application/json" \
  -d '{"text":"test note via API"}' | grep -o '"id":[0-9]*' | cut -d: -f2)
echo "Saved note id: $NOTE_ID"
# Expected: {"id":<N>,"text":"test note via API","created_at":"..."}
```

### 4.4 Search notes

```bash
docker exec ${APP_NAME}-agent curl -s "http://app:4000${BASE_PATH}/api/notes?q=test"
# Expected: array containing the note saved in 4.3
```

### 4.5 Delete a note

```bash
docker exec ${APP_NAME}-agent curl -s -X DELETE "http://app:4000${BASE_PATH}/api/notes/${NOTE_ID}"
# Expected: {"deleted":true} or 204 No Content
```

---

## 5. Agent Prompt Tests

Clear any stale session before running (required after reinstall):

```bash
sed -i 's/^SESSION_ID=.*/SESSION_ID=/' tools/tests/.env
```

```bash
cd tools/tests
```

### 5.1 Basic note via natural language

```bash
bash agent-msg.sh "note tomorrow 9.00 daily meeting"
# Expected: confirmation e.g. "Saved: tomorrow 9.00 daily meeting"
```

### 5.2 Trigger word: "note that"

```bash
bash agent-msg.sh "note that the deploy is scheduled for Friday"
# Expected: saves note, returns confirmation
```

### 5.3 Trigger word: "remember"

```bash
bash agent-msg.sh "remember to review PR #42 tomorrow"
# Expected: saves note, returns confirmation
```

### 5.4 Search via natural language

```bash
bash agent-msg.sh "what did I note about daily meeting"
# Expected: numbered list of matching notes
```

### 5.5 Summarize today's notes

```bash
bash agent-msg.sh "summarize today's notes"
# Expected: agent fetches all notes, filters by today, returns summary
```

---

## 6. Skill Tests

### 6.1 /save-note — save via skill

```bash
bash agent-msg.sh "/save-note test skill save"
# Expected: "Saved ✓" or similar confirmation
# Must NOT return: "Unknown command"
```

### 6.2 /search — found

```bash
bash agent-msg.sh "/search daily meeting"
# Expected: numbered list with matching notes
```

### 6.3 /search — not found

```bash
bash agent-msg.sh "/search xyz-nothing-here"
# Expected: "No notes found for 'xyz-nothing-here'"
# Must NOT return empty string
```

---

## 7. Uninstall

```bash
gateway app uninstall ${APP_NAME}
```

**Verify symlink is removed:**

```bash
# apps/<app-name> symlink must be gone
ls ~/.claude-gateway/apps/${APP_NAME}
# Expected: No such file or directory
```

> `~/.claude-gateway/agents/${AGENT_NAME}` is preserved by the gateway (stores conversation history and sessions). This is intentional — remove manually only if a fully clean state is needed.

**Verify containers are gone:**

```bash
docker ps --filter name=${APP_NAME}
# Expected: empty
```

> Postgres data at `postgres/` is preserved. Delete manually for a fully clean state.