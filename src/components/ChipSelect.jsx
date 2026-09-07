// Horizontal, scrollable single-select of pill buttons — replaces a <select>
// for the fields touched on every box (Room, Status) so picking one is a
// single tap instead of opening a native dropdown.
export default function ChipSelect({ options, value, onChange, colors }) {
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
    </div>
  )
}
