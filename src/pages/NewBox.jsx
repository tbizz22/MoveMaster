import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createContainer, listContainers } from '../lib/db'
import { useHousehold } from '../lib/HouseholdContext'
import { ROOM_OPTIONS, STATUS_OPTIONS, STATUS_COLORS } from '../lib/constants'
import ChipSelect from '../components/ChipSelect'
import Disclosure from '../components/Disclosure'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewBox() {
  const navigate = useNavigate()
  const { householdId } = useHousehold()
  const [form, setForm] = useState({
    name: '',
    room: '',
    status: 'Packed',
    fragile: false,
    heavy: false,
    notes: '',
    packed_date: today(),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [existingBoxes, setExistingBoxes] = useState(null)

  useEffect(() => {
    listContainers()
      .then(setExistingBoxes)
      .catch((err) => setError(err.message))
  }, [])

  const nextBoxNumber = useMemo(() => {
    if (!form.room || !existingBoxes) return null
    const inRoom = existingBoxes.filter((b) => b.room === form.room)
    const max = inRoom.reduce((m, b) => Math.max(m, b.box_number || 0), 0)
    return max + 1
  }, [form.room, existingBoxes])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fields = {
        name: form.name || null,
        room: form.room || null,
        status: form.status || null,
        fragile: form.fragile,
        heavy: form.heavy,
        notes: form.notes || null,
        packed_date: form.packed_date || null,
        box_number: nextBoxNumber,
      }
      const record = await createContainer(householdId, fields)
      navigate(`/boxes/${record.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <section className="entry-screen">
      <div className="page-header">
        <h1>New Box</h1>
        <Link to="/" className="button">
          Cancel
        </Link>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field-block">
          <p className="field-label">Room</p>
          <ChipSelect options={ROOM_OPTIONS} value={form.room} onChange={(v) => update('room', v)} />
        </div>

        {form.room && (
          <p className="box-number-preview">
            This will be{' '}
            <strong>
              {form.room.slice(0, 3).toUpperCase()}-{String(nextBoxNumber ?? '?').padStart(3, '0')}
            </strong>
          </p>
        )}

        <div className="field-block">
          <p className="field-label">Status</p>
          <ChipSelect
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(v) => update('status', v)}
            colors={STATUS_COLORS}
          />
        </div>

        <div className="field-block toggle-row">
          <button
            type="button"
            className={`toggle-chip${form.fragile ? ' toggle-chip-active' : ''}`}
            onClick={() => update('fragile', !form.fragile)}
            aria-pressed={form.fragile}
          >
            🔺 Fragile
          </button>
          <button
            type="button"
            className={`toggle-chip${form.heavy ? ' toggle-chip-active' : ''}`}
            onClick={() => update('heavy', !form.heavy)}
            aria-pressed={form.heavy}
          >
            🏋️ Heavy
          </button>
        </div>

        <Disclosure label="More details (name, date, notes)">
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Optional label"
            />
          </label>
          <label>
            Packed Date
            <input
              type="date"
              value={form.packed_date}
              onChange={(e) => update('packed_date', e.target.value)}
            />
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
          </label>
        </Disclosure>

        {error && <p className="error">{error}</p>}

        <div className="sticky-action-bar">
          <button type="submit" className="button primary button-large" disabled={saving || !form.room}>
            {saving ? 'Creating…' : 'Create Box'}
          </button>
        </div>
      </form>
    </section>
  )
}
