export default function Sidebar({ chats, activeId, open, onNew, onSelect, onDelete }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">FreeChat</div>

      <button className="new-chat" onClick={onNew}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New chat
      </button>

      <nav className="chat-list" aria-label="Your chats">
        {chats.length === 0 && <p className="muted">Your chats will show up here.</p>}
        {chats.map((c) => (
          <div key={c.id} className={`chat-item ${c.id === activeId ? 'active' : ''}`}>
            <button className="chat-title" onClick={() => onSelect(c.id)} title={c.title}>
              {c.title}
            </button>
            <button
              className="chat-del"
              aria-label={`Delete chat: ${c.title}`}
              onClick={() => onDelete(c.id)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      <p className="side-note">
        Free models are rate limited and can be slow when they are busy. If one stalls, pick another.
      </p>
    </aside>
  )
}
