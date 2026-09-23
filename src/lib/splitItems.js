import { supabase } from './supabaseClient'

// Asks the server (api/split-items.js) to split a dictated transcript into
// item names using AI. Sends the Supabase access token so only signed-in
// users can use the endpoint.
export async function splitItemsWithAI(transcript) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const resp = await fetch('/api/split-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ transcript }),
  })
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(body.error || `Smart split failed (${resp.status})`)
  }
  return body.items
}
