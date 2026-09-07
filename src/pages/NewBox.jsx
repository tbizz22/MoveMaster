import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createRecord } from '../lib/airtable'
import { CONTAINER_TABLE_ID, ROOM_OPTIONS, STATUS_OPTIONS } from '../lib/constants'

export default function NewBox() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    Name: '',
    Room: '',
    'Box Number': '',
    Status: 'Packed',
    Fragile: false,
    Heavy: false,
    Notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      }
      if (form['Box Number'] !== '') {
        fields['Box Number'] = Number(form['Box Number'])
      }
      const record = await createRecord(CONTAINER_TABLE_ID, fields)
      navigate(`/boxes/${record.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>New Box</h1>
        <Link to="/" className="button">
          Cancel
        </Link>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            value={form.Name}
            onChange={(e) => update('Name', e.target.value)}
            placeholder="Optional label"
          />
        </label>

        <div className="form-row">
          <label>
            Room
            <select value={form.Room} onChange={(e) => update('Room', e.target.value)} required>
              <option value="">Select a room…</option>
              {ROOM_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label>
            Box Number
            <input
              type="number"
              min="1"
              value={form['Box Number']}
              onChange={(e) => update('Box Number', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Status
            <select value={form.Status} onChange={(e) => update('Status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.Fragile}
              onChange={(e) => update('Fragile', e.target.checked)}
            />
            Fragile
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.Heavy}
              onChange={(e) => update('Heavy', e.target.checked)}
            />
            Heavy
          </label>
        </div>

        <label>
          Notes
          <textarea value={form.Notes} onChange={(e) => update('Notes', e.target.value)} rows={3} />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="button primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create Box'}
        </button>
      </form>
    </section>
  )
}
