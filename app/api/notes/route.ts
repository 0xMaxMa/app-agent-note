import { query, ensureMigrated } from '@/lib/db'

export async function GET(request: Request) {
  await ensureMigrated()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  const result = q
    ? await query(
        `SELECT id, text, created_at FROM notes WHERE text ILIKE $1 ORDER BY created_at DESC`,
        [`%${q}%`]
      )
    : await query(`SELECT id, text, created_at FROM notes ORDER BY created_at DESC`)

  return Response.json(result.rows)
}

export async function POST(request: Request) {
  await ensureMigrated()
  const body = await request.json()
  const { text } = body

  if (!text || typeof text !== 'string' || !text.trim()) {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }

  const result = await query(
    `INSERT INTO notes (text) VALUES ($1) RETURNING id, text, created_at`,
    [text.trim()]
  )

  return Response.json(result.rows[0], { status: 201 })
}
