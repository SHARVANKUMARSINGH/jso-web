import { useEffect, useMemo, useRef, useState } from 'react'

function formatContext(n) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M context`
  return `${Math.round(n / 1000)}K context`
}

export default function ModelPicker({ models, status, value, onChange, onRetry }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    inputRef.current?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = models.find((m) => m.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return models
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q),
    )
  }, [models, query])

  if (status === 'error') {
    return (
      <button className="picker-btn" onClick={onRetry}>
        Couldn’t load models. Try again
      </button>
    )
  }

  const label =
    status === 'loading' ? 'Loading free models…' : current?.name ?? 'Choose a model'

  return (
    <div className="picker" ref={rootRef}>
      <button
        className="picker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={status === 'loading'}
        onClick={() => {
          setQuery('')
          setOpen((o) => !o)
        }}
      >
        <span className="picker-label">{label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="popover">
          <input
            ref={inputRef}
            className="picker-search"
            type="search"
            placeholder={`Search ${models.length} free models`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search free models"
          />
          <div className="picker-list" role="listbox" aria-label="Free models">
            {filtered.length === 0 && <p className="muted pad">No model matches “{query}”.</p>}
            {filtered.map((m) => (
              <button
                key={m.id}
                role="option"
                aria-selected={m.id === value}
                className="picker-option"
                onClick={() => {
                  onChange(m.id)
                  setOpen(false)
                }}
              >
                <span className="opt-name">{m.name}</span>
                <span className="opt-ctx">{formatContext(m.context)}</span>
                <span className="opt-id">{m.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
