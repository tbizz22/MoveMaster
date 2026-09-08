// Data layer backed by Supabase Postgres + Storage. Row Level Security
// scopes every query to the caller's household automatically — there's no
// need to filter by household_id client-side (unlike the old Airtable
// proxy, which had to enforce that itself since Airtable has no RLS
// equivalent). household_id is still required on writes because the RLS
// `with check` clause on inserts needs a value to validate.
import { supabase } from './supabaseClient'

export async function listContainers() {
  const { data, error } = await supabase
    .from('containers_with_box_id')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export async function getContainer(id) {
  const { data, error } = await supabase
    .from('containers_with_box_id')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createContainer(householdId, fields) {
  const { data, error } = await supabase
    .from('containers')
    .insert({ ...fields, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  // Re-fetch from the view so the caller gets the derived box_id back too.
  return getContainer(data.id)
}

export async function updateContainer(id, fields) {
  const { data, error } = await supabase
    .from('containers')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Just container_id, for computing per-box item counts on the list view
// without fetching every item's full fields.
export async function listItemCounts() {
  const { data, error } = await supabase.from('items').select('container_id')
  if (error) throw error
  const counts = {}
  for (const row of data) {
    counts[row.container_id] = (counts[row.container_id] || 0) + 1
  }
  return counts
}

export async function listItems(containerId) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createItem(householdId, containerId, fields) {
  const { data, error } = await supabase
    .from('items')
    .insert({ ...fields, household_id: householdId, container_id: containerId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createItems(householdId, containerId, itemsFields) {
  const rows = itemsFields.map((fields) => ({
    ...fields,
    household_id: householdId,
    container_id: containerId,
  }))
  const { data, error } = await supabase.from('items').insert(rows).select()
  if (error) throw error
  return data
}

export async function updateItem(id, fields) {
  const { data, error } = await supabase.from('items').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Searches item names across every box in the household (case-insensitive
// substring match), returning each item's container so callers can link to
// the box it's packed in.
export async function searchItems(query) {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('items')
    .select('*, containers_with_box_id(id, box_id, room, name)')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
  if (error) throw error
  return data
}

const PHOTO_BUCKET = 'photos'

// Uploads a photo for a container (kind: "exterior" | "contents"), storing
// it at {household_id}/{container_id}/{kind}-{timestamp}.{ext} and updating
// the container's *_photo_path column. Returns a signed URL for display.
export async function uploadContainerPhoto(householdId, containerId, kind, file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${householdId}/${containerId}/${kind}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg' })
  if (uploadError) throw uploadError

  const column = kind === 'exterior' ? 'exterior_photo_path' : 'contents_photo_path'
  const { error: updateError } = await supabase.from('containers').update({ [column]: path }).eq('id', containerId)
  if (updateError) throw updateError

  return getSignedPhotoUrl(path)
}

export async function getSignedPhotoUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
