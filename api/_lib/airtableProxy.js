// Core proxy logic shared by the Vercel serverless functions (api/*.js) and
// the local dev middleware (vite.config.js). Keeping this in one place means
// `npm run dev` and a real Vercel deployment behave identically.
//
// The Airtable token/base id live only in server-side env vars here
// (AIRTABLE_TOKEN / AIRTABLE_BASE_ID, no VITE_ prefix) so they never reach
// the browser bundle.

function getEnv() {
  return {
    token: process.env.AIRTABLE_TOKEN,
    baseId: process.env.AIRTABLE_BASE_ID,
  }
}

// Works against both a Vercel-parsed body (req.body already an object) and a
// raw Node IncomingMessage (Vite dev middleware), so the same handler runs
// unmodified in both environments.
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
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

export async function handleHealth(req, res) {
  const { token, baseId } = getEnv()
  sendJson(res, 200, { configured: Boolean(token && baseId) })
}

// pathSegments: the parts of the Airtable REST path after `/v0/{baseId}/`,
// e.g. ['Container'] for listing/creating, or ['Container', 'recXXX'] for a
// single record. searchParams: a URLSearchParams of Airtable list params
// (maxRecords, offset, filterByFormula, ...).
export async function handleRecords(req, res, pathSegments, searchParams) {
  const { token, baseId } = getEnv()
  if (!token || !baseId) {
    sendJson(res, 500, { error: 'Server is missing AIRTABLE_TOKEN/AIRTABLE_BASE_ID' })
    return
  }

  const encodedPath = pathSegments.map(encodeURIComponent).join('/')
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodedPath}`)
  if (searchParams) {
    for (const [key, value] of searchParams.entries()) {
      url.searchParams.append(key, value)
    }
  }

  const method = req.method
  let body
  if (method === 'POST' || method === 'PATCH') {
    body = JSON.stringify(await readJsonBody(req))
  }

  const upstream = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  })
  const text = await upstream.text()
  res.statusCode = upstream.status
  res.setHeader('Content-Type', 'application/json')
  res.end(text)
}

export async function handleUpload(req, res) {
  const { token, baseId } = getEnv()
  if (!token || !baseId) {
    sendJson(res, 500, { error: 'Server is missing AIRTABLE_TOKEN/AIRTABLE_BASE_ID' })
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const parsed = (await readJsonBody(req)) || {}
  const { recordId, fieldId, filename, contentType, file } = parsed
  if (!recordId || !fieldId || !filename || !file) {
    sendJson(res, 400, { error: 'recordId, fieldId, filename, and file (base64) are required' })
    return
  }

  const upstream = await fetch(
    `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldId}/uploadAttachment`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: contentType || 'application/octet-stream',
        filename,
        file,
      }),
    },
  )
  const text = await upstream.text()
  res.statusCode = upstream.status
  res.setHeader('Content-Type', 'application/json')
  res.end(text)
}
