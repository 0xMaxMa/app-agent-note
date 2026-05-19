import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params)
}

let migrationPromise: Promise<void> | null = null

export function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id         SERIAL PRIMARY KEY,
          text       TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS notes_text_gin_idx
        ON notes USING gin(to_tsvector('simple', text))
      `)
    })()
  }
  return migrationPromise
}
