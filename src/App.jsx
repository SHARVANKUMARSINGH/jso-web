import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFreeModels, streamChat } from './api'
import Sidebar from './components/Sidebar'
import ModelPicker from './components/ModelPicker'
import Message from './components/Message'
import Composer from './components/Composer'

const STARTERS = [
  'Explain how vaccines train the immune system',
  'Write a Python function that merges overlapping intervals',
  'Plan three days in Lisbon on a small budget',
  'Help me reply politely to a client who missed a deadline',
]

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be full or blocked; the app still works without it */
  }
}

export default function App() {
  const [chats, setChats] = useState(() => load('freechat.chats', []))
  const [activeId, setActiveId] = useState(() => load('freechat.active', null))
  const [model, setModel] = useState(() => load('freechat.model', ''))
  const [models, setModels] = useState([])
  const [modelStatus, setModelStatus] = useState('loading') // loading | ready | error
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const stickToBottom = useRef(true)

  const active = chats.find((c) => c.id === activeId) ?? null
  const messages = active?.messages ?? []

  // ---- model list -------------------------------------------------------
  const loadModels = useCallback(async () => {
    setModelStatus('loading')
    try {
      const list = await fetchFreeModels()
      setModels(list)
      setModelStatus('ready')
      setModel((prev) => {
        if (list.some((m) => m.id === prev)) return prev
        return list.find((m) => m.id === 'openrouter/free')?.id ?? list[0]?.id ?? ''
      })
    } catch (e) {
      setModelStatus('error')
      setError(`Could not load the free model list: ${e.message}`)
    }
  }, [])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  // ---- persistence (skipped mid-stream to avoid a write per token) -------
  useEffect(() => {
    if (!streaming) save('freechat.chats', chats)
  }, [chats, streaming])
  useEffect(() => save('freechat.active', activeId), [activeId])
  useEffect(() => {
    if (model) save('freechat.model', model)
  }, [model])

  // ---- autoscroll --------------------------------------------------------
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  // ---- chat actions ------------------------------------------------------
  const patchChat = (id, fn) =>
    setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)))

  async function run(chatId, botId, history) {
    const controller = new AbortController()
    abortRef.current = controller
    setStreaming(true)
    stickToBottom.current = true

    try {
      await streamChat({
        model,
        messages: history.map(({ role, content }) => ({ role, content })),
        signal: controller.signal,
        onToken: (token) =>
          patchChat(chatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === botId ? { ...m, content: m.content + token } : m,
            ),
          })),
      })
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      abortRef.current = null
      setStreaming(false)
      // Drop the placeholder if the model never produced anything.
      patchChat(chatId, (c) => ({
        ...c,
        messages: c.messages.filter((m) => !(m.id === botId && m.content === '')),
      }))
    }
  }

  async function send(text) {
    setError('')
    const userMsg = { id: uid(), role: 'user', content: text }
    const botMsg = { id: uid(), role: 'assistant', content: '', model }

    let chatId = active?.id
    let history
    if (!chatId) {
      chatId = uid()
      history = [userMsg]
      const chat = {
        id: chatId,
        title: text.length > 48 ? `${text.slice(0, 48)}…` : text,
        messages: [userMsg, botMsg],
        updatedAt: Date.now(),
      }
      setChats((cs) => [chat, ...cs])
      setActiveId(chatId)
    } else {
      history = [...active.messages, userMsg]
      patchChat(chatId, (c) => ({
        ...c,
        messages: [...c.messages, userMsg, botMsg],
        updatedAt: Date.now(),
      }))
    }
    await run(chatId, botMsg.id, history)
  }

  function retry() {
    if (!active || streaming) return
    setError('')
    const kept = [...active.messages]
    if (kept.at(-1)?.role === 'assistant') kept.pop()
    if (kept.length === 0) return
    const botMsg = { id: uid(), role: 'assistant', content: '', model }
    patchChat(active.id, (c) => ({ ...c, messages: [...kept, botMsg] }))
    run(active.id, botMsg.id, kept)
  }

  const stop = () => abortRef.current?.abort()

  function newChat() {
    setActiveId(null)
    setError('')
    setSidebarOpen(false)
  }

  function selectChat(id) {
    setActiveId(id)
    setError('')
    setSidebarOpen(false)
  }

  function deleteChat(id) {
    setChats((cs) => cs.filter((c) => c.id !== id))
    if (id === activeId) setActiveId(null)
  }

  const lastMessage = messages.at(-1)
  const canRetry = !!active && !streaming && !!lastMessage

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeId={activeId}
        open={sidebarOpen}
        onNew={newChat}
        onSelect={selectChat}
        onDelete={deleteChat}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn menu-btn"
            aria-label="Open chat list"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <ModelPicker
            models={models}
            status={modelStatus}
            value={model}
            onChange={setModel}
            onRetry={loadModels}
          />
        </header>

        <div className="scroll" ref={scrollRef} onScroll={onScroll}>
          <div className="thread">
            {messages.length === 0 ? (
              <section className="empty">
                <h1>Ask a free model anything</h1>
                <p>
                  Choose a model at the top and switch whenever you like. Each reply is labeled
                  with the model that wrote it.
                </p>
                <ul className="starters">
                  {STARTERS.map((s) => (
                    <li key={s}>
                      <button onClick={() => send(s)} disabled={!model || streaming}>
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              messages.map((m, i) => {
                const isLast = i === messages.length - 1
                return (
                  <Message
                    key={m.id}
                    message={m}
                    pending={streaming && isLast && m.role === 'assistant'}
                    canRetry={isLast && m.role === 'assistant' && !streaming}
                    onRetry={retry}
                  />
                )
              })
            )}
          </div>
        </div>

        <div className="dock">
          {error && (
            <div className="error" role="alert">
              <span>{error}</span>
              <span className="error-actions">
                {canRetry && <button onClick={retry}>Try again</button>}
                <button onClick={() => setError('')}>Dismiss</button>
              </span>
            </div>
          )}
          <Composer
            onSend={send}
            onStop={stop}
            streaming={streaming}
            disabled={!model}
          />
        </div>
      </main>
    </div>
  )
}
