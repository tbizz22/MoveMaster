import { useState } from 'react'

// Horizontal, scrollable single-select of pill buttons — replaces a <select>
// for the fields touched on every box (Room, Status) so picking one is a
// single tap instead of opening a native dropdown. When `allowCustom` is set,
// a trailing "+ Add" chip turns into a text input so a new option (e.g. a
// room name not in the default list) can be typed in on the fly — the caller
// is responsible for remembering it via the same `onChange`.
export default function ChipSelect({ options, value, onChange, colors, allowCustom, addLabel = '+ Add' }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function submitDraft() {
    const trimmed = draft.trim()
    setDraft('')
    setAdding(false)
    if (trimmed) onChange(trimmed)
  }

  return (
    <div className="chip-select" role="radiogroup">
      {options.map((opt) => {
        const selected = opt === value
        const color = colors?.[opt]
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`chip${selected ? ' chip-selected' : ''}`}
            style={selected && color ? { background: color, borderColor: color, color: 'white' } : undefined}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        )
      })}
      {allowCustom &&
        (adding ? (
          <input
            type="text"
            className="chip-add-input"
            autoFocus
            value={draft}
            placeholder="New name…"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitDraft()
              } else if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
          />
        ) : (
          <button type="button" className="chip chip-add" onClick={() => setAdding(true)}>
            {addLabel}
          </button>
        ))}
    </div>
  )
}
