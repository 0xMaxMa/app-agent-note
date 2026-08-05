import { query } from '@/lib/db'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  const id = parseInt(idParam, 10)
  if (isNaN(id)) {
    return Response.json({ error: 'invalid id' }, { status: 400 })
  }

  const result = await query(`DELETE FROM notes WHERE id = $1`, [id])

  if ((result.rowCount ?? 0) === 0) {
    return Response.json({ error: 'note not found' }, { status: 404 })
  }

  return Response.json({ deleted: true })
}
