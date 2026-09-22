# FreeChat

A React + Vite chat app that talks to the **free models on OpenRouter**.
It loads the current list of free models, lets you search and switch between them,
streams replies, renders markdown and code, and keeps your chats in the browser.

## Run it

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Your API key

The key is stored in `.env`:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

It is deliberately **not** named `VITE_...`. Vite bundles every `VITE_` variable into
the browser code, where anyone can read it. Instead, `vite.config.js` reads the key on
the server and adds it to requests as they pass through the `/api/openrouter` proxy, so the
browser never sees it.

- `.env` is listed in `.gitignore`. Don't commit it or share the zip with the key inside.
- `.env.example` shows the format for teammates.
- After changing `.env`, restart `npm run dev`.

## Scripts

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                          |
| `npm run build`   | Production build into `dist/`                       |
| `npm run preview` | Serves the build locally (proxy and key still work) |

## Deploying

The proxy only exists in the Vite dev and preview servers. A static host serving `dist/`
has no proxy, so to deploy you need a small server-side function that forwards
`/api/openrouter/*` to `https://openrouter.ai/api/v1/*` with the key attached
(a Vercel or Netlify function, a Cloudflare Worker, or a tiny Express server all work).
Never put the key in client-side code.

## Notes

- Free models are rate limited and can be slow or briefly unavailable. Pick another
  model from the list if one stalls.
- Chats and your selected model are saved in `localStorage`.
- Free model availability changes, so the list is fetched fresh on every load.
