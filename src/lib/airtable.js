// All requests go through our own /api/* serverless functions (see /api and
// vite.config.js), which hold the Airtable token server-side. The browser
// never sees it — see BACKLOG.md for why this replaced the old client-side
// VITE_AIRTABLE_TOKEN approach.
const API_ROOT = '/api/airtable'

async function request(path, options = {}) {
  const res = await fetch(`${API_ROOT}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable request failed (${res.status}): ${body}`)
  }
  return res.json()
}

// Server-side config can't be inspected synchronously from the browser, so
// this checks the /api/health endpoint instead of an env var.
export async function checkConfigured() {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.configured)
  } catch {
    return false
  }
}

export function listRecords(table, params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`${encodeURIComponent(table)}${query ? `?${query}` : ''}`)
}

export async function listAllRecords(table, params = {}) {
  let records = []
  let offset
  do {
    const page = await listRecords(table, offset ? { ...params, offset } : params)
    records = records.concat(page.records)
    offset = page.offset
  } while (offset)
  return records
}

export function getRecord(table, recordId) {
  return request(`${encodeURIComponent(table)}/${recordId}`)
}

export function createRecord(table, fields) {
  return request(encodeURIComponent(table), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
}

export function updateRecord(table, recordId, fields) {
  return request(`${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export function deleteRecord(table, recordId) {
  return request(`${encodeURIComponent(table)}/${recordId}`, {
    method: 'DELETE',
  })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Uploads a single file to an attachment field on an existing record, via
// our /api/airtable/upload proxy (tableId is unused here — Airtable's
// uploadAttachment endpoint only needs the record and field — but kept in
// the signature so call sites don't need to change).
export async function uploadAttachment(tableId, recordId, fieldId, file) {
  const base64 = await fileToBase64(file)
  const res = await fetch(`${API_ROOT}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId,
      fieldId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      file: base64,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable attachment upload failed (${res.status}): ${body}`)
  }
  return res.json()
}
