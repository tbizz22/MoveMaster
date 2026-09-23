import { useMemo, useState } from 'react'
import { STICKER_TYPES } from '../lib/stickers'

function defaultQuantities() {
  const q = {}
  for (const s of STICKER_TYPES) q[s.id] = 0
  return q
}

export default function Stickers() {
  const [quantities, setQuantities] = useState(defaultQuantities)

  function setQty(id, value) {
    const n = Math.max(0, Math.min(99, Number(value) || 0))
    setQuantities((q) => ({ ...q, [id]: n }))
  }

  function adjust(id, delta) {
    setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.min(99, (q[id] || 0) + delta)) }))
  }

  const sheet = useMemo(() => {
    const cards = []
    for (const sticker of STICKER_TYPES) {
      const count = quantities[sticker.id] || 0
      for (let i = 0; i < count; i++) {
        cards.push({ ...sticker, key: `${sticker.id}-${i}` })
      }
    }
    return cards
  }, [quantities])

  return (
    <section>
      <div className="page-header no-print">
        <h1>Stickers</h1>
      </div>

      <div className="sticker-controls no-print">
        <p className="field-label">Choose stickers and how many of each, then print.</p>
        <ul className="sticker-picker-list">
          {STICKER_TYPES.map((s) => (
            <li key={s.id} className="sticker-picker-row">
              <span className="sticker-picker-label">
                <span aria-hidden="true">{s.emoji}</span> {s.label}
              </span>
              <span className="qty-stepper">
                <button type="button" onClick={() => adjust(s.id, -1)} aria-label={`Fewer ${s.label}`}>
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={quantities[s.id]}
                  onChange={(e) => setQty(s.id, e.target.value)}
                />
                <button type="button" onClick={() => adjust(s.id, 1)} aria-label={`More ${s.label}`}>
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="sticky-action-bar">
          <button
            type="button"
            className="button primary button-large"
            disabled={sheet.length === 0}
            onClick={() => window.print()}
          >
            Print {sheet.length > 0 ? `${sheet.length} Sticker${sheet.length === 1 ? '' : 's'}` : 'Stickers'}
          </button>
        </div>
      </div>

      {sheet.length === 0 ? (
        <p className="no-print">No stickers selected yet.</p>
      ) : (
        <div className="sticker-sheet">
          {sheet.map((s) => (
            <div key={s.key} className={`sticker-card sticker-${s.variant}`}>
              {s.variant === 'write-in' ? (
                <>
                  <p className="sticker-write-title">
                    <span aria-hidden="true">{s.emoji}</span> Contents
                  </p>
                  <div className="sticker-write-line" />
                  <div className="sticker-write-line" />
                  <div className="sticker-write-line" />
                  <p className="sticker-write-footer">
                    Room: ________________ Box #: ______
                  </p>
                </>
              ) : (
                <>
                  <span className="sticker-emoji" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <span className="sticker-text">{s.text}</span>
                  {s.subtext && <span className="sticker-subtext">{s.subtext}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
