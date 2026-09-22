// Cloudflare Pages Function — handles every request under /api/openrouter/*
// in production.
//
// vite.config.js's `server.proxy`/`preview.proxy` ONLY exists while a Vite
// dev/preview process is actually running (`npm run dev` / `npm run
// preview`) — Cloudflare Pages serves the static `dist/` build with no Vite
// process behind it, so that proxy is completely inert once deployed. This
// Function is what makes /api/openrouter/* actually work in production: it
// runs on Cloudflare's edge, reads the OPENROUTER_API_KEY secret from the
// environment variables set in the Pages dashboard (Settings → Environment
// variables), and forwards the request to OpenRouter with the key attached
// server-side — the browser never sees it, same guarantee as the dev proxy.
//
// File-based routing: the double-bracket [[path]] segment below is
// Cloudflare's catch-all syntax — it matches every sub-path under
// /api/openrouter/ (e.g. "models", "chat/completions") and hands them to
// `context.params.path` as an array of segments.

export async function onRequest(context) {
  const { request, env, params } = context;

  const key = env.OPENROUTER_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "OPENROUTER_API_KEY is not set for this Pages environment. Add it under Settings \u2192 Environment variables in the Cloudflare dashboard, then redeploy.",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const segments = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const upstreamPath = segments.join("/");
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `https://openrouter.ai/api/v1/${upstreamPath}${incomingUrl.search}`;

  // Forward the original headers, but overwrite Authorization/X-Title and
  // strip Host — Host must match the upstream server, not this Function's.
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("X-Title", "FreeChat");
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
  };

  const upstreamResponse = await fetch(upstreamUrl, init);

  // Stream the body straight through unmodified — required for the SSE
  // chat-completions stream that src/api.js's streamChat() reads token by
  // token. Drop content-encoding/length since we're not re-compressing or
  // re-measuring the body ourselves.
  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
