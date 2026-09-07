const API_ROOT = 'https://api.airtable.com/v0'

const token = import.meta.env.VITE_AIRTABLE_TOKEN
const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID

function assertConfigured() {
  if (!token || !baseId) {
    throw new Error(
      'Airtable is not configured. Set VITE_AIRTABLE_TOKEN and VITE_AIRTABLE_BASE_ID in .env.local',
    )
  }
}

async function request(path, options = {}) {
  assertConfigured()
  const res = await fetch(`${API_ROOT}/${baseId}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
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

export function isConfigured() {
  return Boolean(token && baseId)
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

// Uploads a single file to an attachment field on an existing record.
// Uses the dedicated uploadAttachment endpoint, which is separate from the
// main data API root/host and takes base64 file content directly.
export async function uploadAttachment(tableId, recordId, fieldId, file) {
  assertConfigured()
  const base64 = await fileToBase64(file)
  const res = await fetch(
    `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldId}/uploadAttachment`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: file.type || 'application/octet-stream',
        filename: file.name,
        file: base64,
      }),
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable attachment upload failed (${res.status}): ${body}`)
  }
  return res.json()
}
