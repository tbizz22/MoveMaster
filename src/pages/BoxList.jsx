import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listContainers, listItemCounts } from '../lib/db'
import { ROOM_OPTIONS, STATUS_OPTIONS, STATUS_COLORS } from '../lib/constants'

export default function BoxList() {
  const [boxes, setBoxes] = useState(null)
  const [itemCounts, setItemCounts] = useState({})
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
      const [containers, counts] = await Promise.all([listContainers(), listItemCounts()])
      setBoxes(containers)
      setItemCounts(counts)
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = useMemo(() => {
    if (!boxes) return []
    return boxes.filter((b) => {
      if (roomFilter && b.room !== roomFilter) return false
      if (statusFilter && b.status !== statusFilter) return false
      return true
    })
  }, [boxes, roomFilter, statusFilter])

  const grouped = useMemo(() => {
    if (!groupByRoom) return { All: filtered }
    const groups = {}
    for (const box of filtered) {
      const room = box.room || 'Unassigned'
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
                    <span className="box-id">{box.box_id || box.name || 'Untitled'}</span>
                    {box.status && (
                      <span className="status-badge" style={{ background: STATUS_COLORS[box.status] }}>
                        {box.status}
                      </span>
                    )}
                  </div>
                  <div className="box-card-meta">
                    <span>{box.room || 'No room'}</span>
                    <span>{itemCounts[box.id] || 0} item(s)</span>
                  </div>
                  {(box.fragile || box.heavy) && (
                    <div className="box-card-badges">
                      {box.fragile && <span className="tag tag-fragile">Fragile</span>}
                      {box.heavy && <span className="tag tag-heavy">Heavy</span>}
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
