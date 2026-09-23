import { ROOM_COLORS } from '../lib/constants'

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

// One 4x6 label, sized for a label printer via the .label-page print rules
// in App.css. Renders the design validated for the backlog item: room-color
// band, Box ID, contents summary, QR code, "N of M" sequence, destination
// room, Fragile/Heavy/this-side-up badges, "if found" line, packed date.
export default function Label({ box, items, qrDataUrl, contactInfo }) {
  const roomColor = ROOM_COLORS[box.room] || '#8a8a8a'
  const contentsSummary = (items || []).map((i) => i.name).filter(Boolean)

  return (
    <div className="label-page">
      <div className="label-band" style={{ background: roomColor }}>
        <span className="label-room">{box.room || 'No room'}</span>
        {box.sequence && (
          <span className="label-sequence">
            {box.sequence.n} of {box.sequence.m}
          </span>
        )}
      </div>

      <div className="label-body">
        <div className="label-main">
          <div className="label-box-id">{box.box_id || box.name || 'Untitled'}</div>
          {box.name && box.box_id && <div className="label-name">{box.name}</div>}

          {box.destination_room && (
            <div className="label-destination">→ {box.destination_room}</div>
          )}

          {(box.fragile || box.heavy || box.this_side_up) && (
            <div className="label-badges">
              {box.fragile && <span className="label-badge label-badge-fragile">FRAGILE</span>}
              {box.heavy && <span className="label-badge label-badge-heavy">HEAVY</span>}
              {box.this_side_up && (
                <span className="label-badge label-badge-side-up">↑ THIS SIDE UP</span>
              )}
            </div>
          )}

          <div className="label-contents">
            <p className="label-contents-title">Contents{contentsSummary.length ? ` (${contentsSummary.length})` : ''}</p>
            {contentsSummary.length > 0 ? (
              <p className="label-contents-list">{contentsSummary.join(', ')}</p>
            ) : (
              <p className="label-contents-list label-contents-empty">No items logged</p>
            )}
          </div>
        </div>

        <div className="label-qr">{qrDataUrl && <img src={qrDataUrl} alt="Scan to view box contents" />}</div>
      </div>

      <div className="label-footer">
        <span>{formatDate(box.packed_date) ? `Packed ${formatDate(box.packed_date)}` : ''}</span>
        {contactInfo && <span className="label-contact">If found, please contact: {contactInfo}</span>}
      </div>
    </div>
  )
}
