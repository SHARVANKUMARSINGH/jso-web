// All calls go through the Vite proxy (/api/openrouter), which adds the
// API key on the server side. The browser never sees the key.
const BASE = '/api/openrouter'

async function readError(res) {
  try {
    const body = await res.json()
    const msg = body?.error?.message
    if (res.status === 401) return msg || 'The API key was rejected. Check OPENROUTER_API_KEY in .env, then restart the dev server.'
    if (res.status === 429) return msg || 'This free model is rate limited right now. Wait a moment or pick another model.'
    return msg || `Request failed (${res.status}).`
  } catch {
    return `Request failed (${res.status}).`
  }
}

function isFree(m) {
  const p = m.pricing || {}
  const zeroPrice = Number(p.prompt) === 0 && Number(p.completion) === 0
  const outputs = m.architecture?.output_modalities
  const producesText = !outputs || outputs.includes('text')
  return (m.id.endsWith(':free') || zeroPrice) && producesText
}

export async function fetchFreeModels(signal) {
  const res = await fetch(`${BASE}/models`, { signal })
  if (!res.ok) throw new Error(await readError(res))
  const { data } = await res.json()
  return data
    .filter(isFree)
    .map((m) => ({ id: m.id, name: m.name || m.id, context: m.context_length || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function streamChat({ model, messages, signal, onToken }) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  })
  if (!res.ok) throw new Error(await readError(res))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() // keep the incomplete line for the next chunk

    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue // skips SSE comments like ": OPENROUTER PROCESSING"
      const data = line.slice(5).trim()
      if (data === '[DONE]') return

      let json
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }
      if (json.error) throw new Error(json.error.message || 'The model returned an error.')
      const delta = json.choices?.[0]?.delta?.content
      if (delta) onToken(delta)
    }
  }
}
