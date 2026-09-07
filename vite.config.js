import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Mirrors the Vercel serverless functions in /api during local dev, so
// `npm run dev` alone (no `vercel dev`/Vercel CLI login needed) exercises
// the exact same server-side Airtable proxy that runs in production.
function airtableApiDevMiddleware(env) {
  return {
    name: 'airtable-api-dev-middleware',
    configureServer(server) {
      // The shared handler reads process.env directly (matching how Vercel
      // injects project env vars in production). Vite only auto-exposes
      // VITE_-prefixed vars to import.meta.env, so mirror the server-only
      // ones from .env.local here explicitly — they still never reach the
      // client bundle.
      process.env.AIRTABLE_TOKEN ??= env.AIRTABLE_TOKEN
      process.env.AIRTABLE_BASE_ID ??= env.AIRTABLE_BASE_ID
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        try {
          const { handleHealth, handleUpload, handleRecords } = await import('./api/_lib/airtableProxy.js')
          const url = new URL(req.url, 'http://localhost')

          if (url.pathname === '/api/health') {
            return await handleHealth(req, res)
          }
          if (url.pathname === '/api/airtable/upload') {
            return await handleUpload(req, res)
          }
          if (url.pathname.startsWith('/api/airtable/')) {
            const rest = url.pathname.slice('/api/airtable/'.length)
            const segments = rest.split('/').filter(Boolean).map(decodeURIComponent)
            return await handleRecords(req, res, segments, url.searchParams)
          }
          next()
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
    plugins: [react(), airtableApiDevMiddleware(env)],
  }
})
