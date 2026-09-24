import { useEffect, useRef, useState } from 'react'

function HammerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 12-8.5 8.5a1.5 1.5 0 0 1-2-2L13 10" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h1.56a6.18 6.18 0 0 1 3.98 1.08l.82.92v-2.07a5.56 5.56 0 0 0-1.64-3.94Z" />
    </svg>
  )
}

export default function Composer({ onSend, onStop, streaming, disabled, buildMode, onToggleBuildMode }) {
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
    <div className="composer-wrap">
      <button
        type="button"
        className={buildMode ? 'build-toggle active' : 'build-toggle'}
        onClick={onToggleBuildMode}
        disabled={streaming}
        aria-pressed={buildMode}
        title="Build App mode: the model writes a complete project, installs and compiles it in the background, then offers it as a .zip download"
      >
        <HammerIcon />
        {buildMode ? 'Build App: on' : 'Build App'}
      </button>

      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            disabled
              ? 'Waiting for models to load…'
              : buildMode
                ? 'Describe the app to build…'
                : 'Message a free model'
          }
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
    </div>
  )
}
