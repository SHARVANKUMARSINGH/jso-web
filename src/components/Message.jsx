import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function extractText(node) {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node?.props?.children) return extractText(node.props.children)
  return ''
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard can be blocked on insecure origins */
    }
  }
  return [copied, copy]
}

function Pre({ children }) {
  const [copied, copy] = useCopy()
  return (
    <div className="codeblock">
      <button className="code-copy" onClick={() => copy(extractText(children))}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>{children}</pre>
    </div>
  )
}

const shortName = (id = '') => id.split('/').pop().replace(/:free$/, '')

export default function Message({ message, pending, canRetry, onRetry }) {
  const [copied, copy] = useCopy()

  if (message.role === 'user') {
    return (
      <div className="msg user">
        <p>{message.content}</p>
      </div>
    )
  }

  return (
    <article className="msg bot">
      {message.model && <div className="bot-model">{shortName(message.model)}</div>}

      {message.content ? (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: Pre }}>
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        pending && (
          <div className="typing" role="status" aria-label="The model is responding">
            <span /><span /><span />
          </div>
        )
      )}

      {message.content && !pending && (
        <div className="msg-actions">
          <button onClick={() => copy(message.content)}>{copied ? 'Copied' : 'Copy'}</button>
          {canRetry && <button onClick={onRetry}>Try again</button>}
        </div>
      )}
    </article>
  )
}
