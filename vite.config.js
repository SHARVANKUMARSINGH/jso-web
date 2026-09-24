import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The OpenRouter key lives in .env as OPENROUTER_API_KEY (no VITE_ prefix),
// so Vite never bundles it into the browser code. The dev/preview server adds
// it to requests server-side and forwards them to OpenRouter.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const key = env.OPENROUTER_API_KEY

  if (!key) {
    console.warn('\n[freechat] OPENROUTER_API_KEY is missing. Add it to your .env file.\n')
  }

  const proxy = {
    '/api/openrouter': {
      target: 'https://openrouter.ai',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/openrouter/, '/api/v1'),
      headers: {
        Authorization: `Bearer ${key ?? ''}`,
        'X-Title': 'FreeChat',
      },
    },
  }

  const headers = {
    // Required for WebContainer's SharedArrayBuffer, used by the "Build App"
    // mode's in-browser npm install/dev-server run — matches public/_headers,
    // which covers the same requirement on the Cloudflare Pages deployment.
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
  };

  return {
    plugins: [react()],
    server: { proxy, headers },
    preview: { proxy, headers },
  }
})
