// Strict JSON action protocol for "Build App" mode — the model describes a
// complete, working project as an ordered list of actions (write_file,
// delete_file, run_command, summary) instead of loose prose. This is the
// same protocol design used by local-ai-app-builder (a dedicated AI app
// builder), reused here as an opt-in mode alongside FreeChat's normal
// plain-text chat, which is completely unaffected by any of this.
import { streamChat } from '../api'

const RESPONSE_FORMAT_SPEC = `Respond with ONLY a JSON object (no markdown fences, no commentary, no text
before or after it) matching EXACTLY this shape:

{
  "actions": [
    { "type": "write_file", "path": "src/App.jsx", "contents": "...\\n" },
    { "type": "delete_file", "path": "src/Old.jsx" },
    { "type": "run_command", "command": "npm install axios" },
    { "type": "summary", "text": "Markdown-formatted explanation, for the chat." }
  ]
}

Strict rules for "actions" — every entry must be EXACTLY one of these four shapes:
  - write_file:  { "type": "write_file", "path": "<string>", "contents": "<string>" }
  - delete_file: { "type": "delete_file", "path": "<string>" }
  - run_command: { "type": "run_command", "command": "<string>" }
  - summary:     { "type": "summary", "text": "<string>" }
- "path" is relative to the project root, forward slashes, no leading "/".
- "contents" on write_file is always the file's COMPLETE contents (never a diff,
  never "// ...rest unchanged").
- EVERY response must include EXACTLY ONE "summary" action, in Markdown, placed
  last in the list, describing what the app does and how it's structured.
- Build a complete, real, working React + Vite app: at minimum package.json
  (with "dev": "vite" and "build": "vite build" scripts, and every dependency
  actually imported anywhere listed with a real version), vite.config.js,
  index.html, src/main.jsx, src/App.jsx — plus any other files the app
  genuinely needs. This gets npm installed and built for real inside a
  sandboxed container, so it must actually be correct and complete, not a
  sketch.
- Never write a run_command that tries to install Node, nvm, or a system
  package manager (apt/brew/etc.) — Node and npm are already installed and
  on PATH inside the container.`

function buildSystemPrompt() {
  return `You are an expert app builder. The user describes an app; you build a complete, real, working project for it, from scratch, in one response.\n\n${RESPONSE_FORMAT_SPEC}`
}

/** Pulls a JSON object out of the model's raw text, tolerating a markdown
 *  fence the model adds despite being told not to. */
function extractJson(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in the response')
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

function validateAction(a, index) {
  if (!a || typeof a !== 'object') throw new Error(`actions[${index}] is not an object`)
  if (a.type === 'write_file') {
    if (typeof a.path !== 'string' || !a.path) throw new Error(`actions[${index}] (write_file) missing "path"`)
    if (typeof a.contents !== 'string') throw new Error(`actions[${index}] (write_file) missing "contents"`)
    return { type: 'write_file', path: a.path, contents: a.contents }
  }
  if (a.type === 'delete_file') {
    if (typeof a.path !== 'string' || !a.path) throw new Error(`actions[${index}] (delete_file) missing "path"`)
    return { type: 'delete_file', path: a.path }
  }
  if (a.type === 'run_command') {
    if (typeof a.command !== 'string' || !a.command) throw new Error(`actions[${index}] (run_command) missing "command"`)
    return { type: 'run_command', command: a.command }
  }
  if (a.type === 'summary') {
    if (typeof a.text !== 'string') throw new Error(`actions[${index}] (summary) missing "text"`)
    return { type: 'summary', text: a.text }
  }
  throw new Error(`actions[${index}] has unknown "type": ${JSON.stringify(a.type)}`)
}

function normalizeResult(parsed) {
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Model response was not a JSON object')
  if (!Array.isArray(parsed.actions)) throw new Error('Model response is missing an "actions" array')
  const allActions = parsed.actions.map(validateAction)
  const summaryTexts = allActions.filter((a) => a.type === 'summary').map((a) => a.text)
  const actions = allActions.filter((a) => a.type !== 'summary')
  return { actions, summary: summaryTexts.length > 0 ? summaryTexts.join('\n\n') : 'Done.' }
}

/**
 * Streams the model's build response (reusing the same streamChat() the
 * normal chat mode uses), then parses it as the strict action protocol
 * above. Throws if the response isn't valid JSON in the expected shape —
 * unlike local-ai-app-builder, there's no bundled offline template to fall
 * back to here, so a bad response is just reported as an error for the user
 * to retry.
 */
export async function generateApp({ model, prompt, signal }) {
  let raw = ''
  await streamChat({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    signal,
    onToken: (token) => {
      raw += token
    },
  })
  const parsed = extractJson(raw)
  return normalizeResult(parsed)
}
