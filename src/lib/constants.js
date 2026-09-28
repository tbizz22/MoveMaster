export const ROOM_OPTIONS = [
  'Kitchen',
  'Living Room',
  'Dining Room',
  'Primary Bedroom',
  'Bedroom 2',
  'Bathroom',
  'Office',
  'Garage',
  'Basement',
  'Other',
]

// Rooms aren't a fixed enum in the database (containers.room is plain text),
// so ROOM_OPTIONS above is just the default suggestion list. This merges in
// any room names already used by the household's own boxes — e.g. a custom
// room someone typed into the picker — so it shows up as a selectable chip
// everywhere, not just wherever it was first created. Defaults come first
// (in their declared order), then custom rooms alphabetically, with "Other"
// always pinned last.
export function mergeRoomOptions(existingRoomNames = []) {
  const seen = new Set(ROOM_OPTIONS.map((r) => r.toLowerCase()))
  const extra = []
  for (const name of existingRoomNames) {
    const trimmed = name?.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    extra.push(trimmed)
  }
  extra.sort((a, b) => a.localeCompare(b))
  const defaults = ROOM_OPTIONS.filter((r) => r !== 'Other')
  const hasOther = ROOM_OPTIONS.includes('Other')
  return hasOther ? [...defaults, ...extra, 'Other'] : [...defaults, ...extra]
}

export const STATUS_OPTIONS = ['Packed', 'Loaded', 'Delivered', 'Unpacked']

export const STATUS_COLORS = {
  Packed: '#4f8cff',
  Loaded: '#e0a300',
  Delivered: '#2fa84f',
  Unpacked: '#8a8a8a',
}

// One color per room, used for the color band on printed box labels (and
// available anywhere else a room needs to be visually distinct at a glance).
export const ROOM_COLORS = {
  Kitchen: '#e05c3f',
  'Living Room': '#3f9de0',
  'Dining Room': '#c77500',
  'Primary Bedroom': '#8a4fd6',
  'Bedroom 2': '#d64fa0',
  Bathroom: '#2fa8a0',
  Office: '#4f8cff',
  Garage: '#6b6375',
  Basement: '#5a6b47',
  Other: '#8a8a8a',
}
