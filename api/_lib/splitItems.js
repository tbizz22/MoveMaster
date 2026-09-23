// Splits a dictated transcript into separate item names using Claude.
// Shared by the Vercel serverless function (api/split-items.js) and the local
// dev middleware (vite.config.js), so `npm run dev` behaves like production.
//
// ANTHROPIC_API_KEY is a server-only env var (no VITE_ prefix) so it never
// reaches the browser bundle.

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5'
const MAX_TRANSCRIPT_CHARS = 2000

const SYSTEM_PROMPT = `You split dictated descriptions of a moving box's contents into a list of separate household items.

The text comes from speech-to-text, so it usually has no punctuation and items run together. Use meaning to decide where one item ends and the next begins, e.g. "cycling shoes running shoes cycling bib" is three items.

Rules:
- Keep each item's wording as spoken; fix only obvious speech-to-text errors and capitalization (sentence case).
- Drop filler ("um", "and then", "there's", "next", "comma") and leading articles ("a", "the").
- Keep quantities and descriptors with their item ("two blue towels").
- Don't invent, merge, or reorder items.`

let client

function getEnv() {
  return {
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
  }
}

// Works against both a Vercel-parsed body (req.body already an object) and a
// raw Node IncomingMessage (Vite dev middleware).
async function readJsonBody(req) {
  if (req.body !== undefined) {
    return req.body
  }
  const raw = await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
  return raw ? JSON.parse(raw) : undefined
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

// Only signed-in users may call this, so the endpoint can't be used by
// strangers to spend the Anthropic key. Validates the Supabase access token
// the browser sends by asking Supabase Auth who it belongs to.
async function isSignedIn(req, { supabaseUrl, supabaseAnonKey }) {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return false
  const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: supabaseAnonKey },
  })
  return resp.ok
}

export async function handleSplitItems(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const env = getEnv()
  if (!env.anthropicKey || !env.supabaseUrl || !env.supabaseAnonKey) {
    sendJson(res, 500, { error: 'Server is missing ANTHROPIC_API_KEY or Supabase settings' })
    return
  }

  if (!(await isSignedIn(req, env))) {
    sendJson(res, 401, { error: 'Not signed in' })
    return
  }

  const { transcript } = (await readJsonBody(req)) || {}
  if (typeof transcript !== 'string' || !transcript.trim()) {
    sendJson(res, 400, { error: 'transcript is required' })
    return
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    sendJson(res, 400, { error: `Transcript is too long (max ${MAX_TRANSCRIPT_CHARS} characters)` })
    return
  }

  client ??= new Anthropic({ apiKey: env.anthropicKey })

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { items: { type: 'array', items: { type: 'string' } } },
            required: ['items'],
            additionalProperties: false,
          },
        },
      },
    })

    if (response.stop_reason !== 'end_turn') {
      sendJson(res, 502, { error: `Item splitting stopped early (${response.stop_reason})` })
      return
    }
    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}'
    const items = (JSON.parse(text).items ?? []).map((s) => s.trim()).filter(Boolean)
    sendJson(res, 200, { items })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      sendJson(res, 429, { error: 'Too many requests — try again in a moment' })
    } else if (err instanceof Anthropic.APIError) {
      sendJson(res, 502, { error: `AI service error (${err.status})` })
    } else {
      throw err
    }
  }
}
