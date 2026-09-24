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

## Deploying (Cloudflare Pages)

The proxy only exists in the Vite dev and preview servers — a static host
serving `dist/` has no proxy, so `functions/api/openrouter/[[path]].js` is a
**Cloudflare Pages Function** that does the same job in production: it runs
on Cloudflare's edge, reads `OPENROUTER_API_KEY` from the Pages project's
environment variables, and forwards `/api/openrouter/*` to
`https://openrouter.ai/api/v1/*` with the key attached server-side. The
browser never sees it, same guarantee as the dev proxy.

Setup:
1. Cloudflare dashboard → your Pages project → **Settings → Environment
   variables** → add `OPENROUTER_API_KEY` as a **Secret**, with your real key
   as the value. Do this for both **Production** and **Preview** if you want
   preview deployments to work too.
2. That's it — `functions/` is picked up automatically on the next deploy, no
   build settings to change. Framework preset (React/Vite) only affects the
   `npm run build` step; Functions are a separate mechanism layered on top of
   whatever static build you're already using.

Deploying somewhere other than Cloudflare Pages (Vercel, Netlify, a plain
Express server)? The same idea applies — a small server-side function that
forwards `/api/openrouter/*` with the key attached — just written for that
platform's own function format instead of `functions/api/openrouter/[[path]].js`.
Never put the key in client-side code.

## Build App mode

A toggle in the composer ("Build App") switches a send from FreeChat's
normal plain-text reply into a different pipeline: the model returns a
complete project as a strict JSON action list (`write_file`, `delete_file`,
`run_command`, `summary` — see `src/lib/appBuilder.js`) instead of prose.
That gets mounted into a **hidden WebContainer** instance
(`src/lib/webcontainerManager.js`) which runs `npm install` then
`npm run build` in the background — no terminal UI is ever shown; the point
is the user never sees or interacts with it, only the outcome. Once that
succeeds, the chat message shows a card (`DownloadAppCard.jsx`) with a
**Download .zip** button that bundles the generated files client-side
(`src/lib/downloadZip.js`, via `jszip`) straight to the device — no server
storage involved.

This needs the same cross-origin isolation headers WebContainer always
needs: `public/_headers` (Cloudflare Pages) and the dev-server headers added
in `vite.config.js` both set `Cross-Origin-Embedder-Policy: require-corp`
and `Cross-Origin-Opener-Policy: same-origin` — without these,
`SharedArrayBuffer` isn't available and the in-browser install/build fails.

If `npm install`/`npm run build` fails (or runs past 3 minutes and gets
killed), the card shows the error instead of a broken zip — a build is only
ever offered once it's actually installed and compiled successfully.

Normal chat (toggle off) is completely unaffected — same plain
`streamChat()` path as before.

## Notes

- Free models are rate limited and can be slow or briefly unavailable. Pick another
  model from the list if one stalls.
- Chats and your selected model are saved in `localStorage`.
- Free model availability changes, so the list is fetched fresh on every load.
