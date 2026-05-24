# /search
Usage: /search <keyword>

1. GET http://app:4000${BASE_PATH}/api/notes?q=<keyword>
2. Return as numbered list. If empty: "No notes found for '<keyword>'"
