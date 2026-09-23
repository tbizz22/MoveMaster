import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv } from 'vite'

// Mirrors the Vercel serverless functions in /api during local dev, so
// `npm run dev` alone (no `vercel dev` needed) runs the same server code.
function apiDevMiddleware(env) {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      // The shared handlers read process.env (as on Vercel). Vite only exposes
      // VITE_-prefixed vars to the client, so mirror the server-only ones from
      // .env.local explicitly — they still never reach the client bundle.
      for (const key of ['ANTHROPIC_API_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
        process.env[key] ??= env[key]
      }
      server.middlewares.use(async (req, res, next) => {
        const { pathname } = new URL(req.url, 'http://localhost')
        if (pathname !== '/api/split-items') return next()
        try {
          const { handleSplitItems } = await import('./api/_lib/splitItems.js')
          await handleSplitItems(req, res)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // HTTPS in dev so phones on the LAN get a secure context — browsers block
    // microphone access (speech recognition "not-allowed") over plain http.
    plugins: [react(), basicSsl(), apiDevMiddleware(env)],
  }
})
