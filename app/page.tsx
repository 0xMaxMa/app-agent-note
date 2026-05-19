'use client'

import { useState, useEffect, useCallback } from 'react'

interface Note {
  id: number
  text: string
  created_at: string
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchNotes = useCallback(async (q = '') => {
    const url = q ? `/api/notes?q=${encodeURIComponent(q)}` : '/api/notes'
    const res = await fetch(url)
    setNotes(await res.json())
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    setText('')
    setLoading(false)
    fetchNotes(search)
  }

  const deleteNote = async (id: number) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    fetchNotes(search)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchNotes(search)
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 24 }}>agent-note</h1>

      <form onSubmit={addNote} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="New note..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 15, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{ padding: '8px 16px', borderRadius: 6, background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Add
        </button>
      </form>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <button type="submit" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); fetchNotes() }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </form>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {notes.length === 0 && (
          <li style={{ color: '#999', padding: '16px 0' }}>No notes yet.</li>
        )}
        {notes.map(note => (
          <li
            key={note.id}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #eee' }}
          >
            <span style={{ flex: 1, lineHeight: 1.5 }}>{note.text}</span>
            <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', marginTop: 2 }}>
              {new Date(note.created_at).toLocaleDateString()}
            </span>
            <button
              onClick={() => deleteNote(note.id)}
              style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
              title="Delete"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
