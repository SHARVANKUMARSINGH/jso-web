import { useEffect, useRef, useState } from 'react'

export default function Composer({ onSend, onStop, streaming, disabled }) {
  const [text, setText] = useState('')
  const ref = useRef(null)

  // Grow with content, up to a cap.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [text])

  const submit = () => {
    const value = text.trim()
    if (!value || streaming || disabled) return
    onSend(value)
    setText('')
  }

  const onKeyDown = (e) => {
    // On touch devices Enter adds a new line; on desktop Enter sends.
    const touch = window.matchMedia('(pointer: coarse)').matches
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={disabled ? 'Waiting for models to load…' : 'Message a free model'}
        aria-label="Message"
      />
      {streaming ? (
        <button className="send stop" onClick={onStop} aria-label="Stop generating">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          className="send"
          onClick={submit}
          disabled={!text.trim() || disabled}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
