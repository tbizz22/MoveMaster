import { useState } from 'react'

// Collapses secondary/rarely-touched fields behind a tap, so the primary
// mobile flow (room, status, fragile/heavy, photo) isn't buried among
// fields most boxes don't need edited every time.
export default function Disclosure({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="disclosure">
      <button type="button" className="disclosure-toggle" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <span className={`disclosure-caret${open ? ' disclosure-caret-open' : ''}`}>▾</span>
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  )
}
