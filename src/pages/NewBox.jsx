import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createRecord, listAllRecords } from '../lib/airtable'
import { CONTAINER_TABLE_ID, ROOM_OPTIONS, STATUS_OPTIONS, STATUS_COLORS } from '../lib/constants'
import ChipSelect from '../components/ChipSelect'
import Disclosure from '../components/Disclosure'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewBox() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    Name: '',
    Room: '',
    Status: 'Packed',
    Fragile: false,
    Heavy: false,
    Notes: '',
    'Packed Date': today(),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [existingBoxes, setExistingBoxes] = useState(null)

  useEffect(() => {
    listAllRecords(CONTAINER_TABLE_ID)
      .then(setExistingBoxes)
      .catch((err) => setError(err.message))
  }, [])

  const nextBoxNumber = useMemo(() => {
    if (!form.Room || !existingBoxes) return null
    const inRoom = existingBoxes.filter((b) => b.fields.Room === form.Room)
    const max = inRoom.reduce((m, b) => Math.max(m, b.fields['Box Number'] || 0), 0)
    return max + 1
  }, [form.Room, existingBoxes])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fields = {
        Name: form.Name || undefined,
        Room: form.Room || undefined,
        Status: form.Status || undefined,
        Fragile: form.Fragile,
        Heavy: form.Heavy,
        Notes: form.Notes || undefined,
        'Packed Date': form['Packed Date'] || undefined,
      }
      if (nextBoxNumber != null) {
        fields['Box Number'] = nextBoxNumber
      }
      const record = await createRecord(CONTAINER_TABLE_ID, fields)
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
          <ChipSelect options={ROOM_OPTIONS} value={form.Room} onChange={(v) => update('Room', v)} />
        </div>

        {form.Room && (
          <p className="box-number-preview">
            This will be <strong>{form.Room.slice(0, 3).toUpperCase()}-{String(nextBoxNumber ?? '?').padStart(3, '0')}</strong>
          </p>
        )}

        <div className="field-block">
          <p className="field-label">Status</p>
          <ChipSelect
            options={STATUS_OPTIONS}
            value={form.Status}
            onChange={(v) => update('Status', v)}
            colors={STATUS_COLORS}
          />
        </div>

        <div className="field-block toggle-row">
          <button
            type="button"
            className={`toggle-chip${form.Fragile ? ' toggle-chip-active' : ''}`}
            onClick={() => update('Fragile', !form.Fragile)}
            aria-pressed={form.Fragile}
          >
            🔺 Fragile
          </button>
          <button
            type="button"
            className={`toggle-chip${form.Heavy ? ' toggle-chip-active' : ''}`}
            onClick={() => update('Heavy', !form.Heavy)}
            aria-pressed={form.Heavy}
          >
            🏋️ Heavy
          </button>
        </div>

        <Disclosure label="More details (name, date, notes)">
          <label>
            Name
            <input
              type="text"
              value={form.Name}
              onChange={(e) => update('Name', e.target.value)}
              placeholder="Optional label"
            />
          </label>
          <label>
            Packed Date
            <input
              type="date"
              value={form['Packed Date']}
              onChange={(e) => update('Packed Date', e.target.value)}
            />
          </label>
          <label>
            Notes
            <textarea value={form.Notes} onChange={(e) => update('Notes', e.target.value)} rows={3} />
          </label>
        </Disclosure>

        {error && <p className="error">{error}</p>}

        <div className="sticky-action-bar">
          <button type="submit" className="button primary button-large" disabled={saving || !form.Room}>
            {saving ? 'Creating…' : 'Create Box'}
          </button>
        </div>
      </form>
    </section>
  )
}
