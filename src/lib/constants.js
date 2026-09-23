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
