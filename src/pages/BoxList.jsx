import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllRecords } from '../lib/airtable'
import { CONTAINER_TABLE_ID, ROOM_OPTIONS, STATUS_OPTIONS, STATUS_COLORS } from '../lib/constants'

export default function BoxList() {
  const [boxes, setBoxes] = useState(null)
  const [error, setError] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [groupByRoom, setGroupByRoom] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setError('')
    try {
      const records = await listAllRecords(CONTAINER_TABLE_ID)
      setBoxes(records)
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = useMemo(() => {
    if (!boxes) return []
    return boxes.filter((b) => {
      if (roomFilter && b.fields.Room !== roomFilter) return false
      if (statusFilter && b.fields.Status !== statusFilter) return false
      return true
    })
  }, [boxes, roomFilter, statusFilter])

  const grouped = useMemo(() => {
    if (!groupByRoom) return { All: filtered }
    const groups = {}
    for (const box of filtered) {
      const room = box.fields.Room || 'Unassigned'
      if (!groups[room]) groups[room] = []
      groups[room].push(box)
    }
    return groups
  }, [filtered, groupByRoom])

  return (
    <section>
      <div className="page-header">
        <h1>Boxes</h1>
        <Link to="/boxes/new" className="button primary">
          + New Box
        </Link>
      </div>

      <div className="toolbar">
        <label>
          Room
          <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
            <option value="">All</option>
            {ROOM_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={groupByRoom}
            onChange={(e) => setGroupByRoom(e.target.checked)}
          />
          Group by room
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {!boxes && !error && <p>Loading…</p>}
      {boxes && filtered.length === 0 && <p>No boxes found.</p>}

      {Object.entries(grouped).map(([room, roomBoxes]) => (
        <div key={room} className="box-group">
          {groupByRoom && (
            <h2>
              {room} <span className="count">({roomBoxes.length})</span>
            </h2>
          )}
          <ul className="box-grid">
            {roomBoxes.map((box) => (
              <li key={box.id}>
                <Link to={`/boxes/${box.id}`} className="box-card">
                  <div className="box-card-top">
                    <span className="box-id">{box.fields['Box ID'] || box.fields.Name || 'Untitled'}</span>
                    {box.fields.Status && (
                      <span
                        className="status-badge"
                        style={{ background: STATUS_COLORS[box.fields.Status] }}
                      >
                        {box.fields.Status}
                      </span>
                    )}
                  </div>
                  <div className="box-card-meta">
                    <span>{box.fields.Room || 'No room'}</span>
                    <span>{(box.fields.Items || []).length} item(s)</span>
                  </div>
                  {(box.fields.Fragile || box.fields.Heavy) && (
                    <div className="box-card-badges">
                      {box.fields.Fragile && <span className="tag tag-fragile">Fragile</span>}
                      {box.fields.Heavy && <span className="tag tag-heavy">Heavy</span>}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
