import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getContainer,
  listContainers,
  updateContainer,
  listItems,
  createItem,
  createItems,
  updateItem,
  uploadContainerPhoto,
  getSignedPhotoUrl,
} from '../lib/db'
import { useHousehold } from '../lib/HouseholdContext'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
import ChipSelect from '../components/ChipSelect'
import Disclosure from '../components/Disclosure'
import { ROOM_OPTIONS, STATUS_OPTIONS, STATUS_COLORS } from '../lib/constants'

export default function BoxDetail() {
  const { id } = useParams()
  const { householdId } = useHousehold()
  const [box, setBox] = useState(null)
  const [allBoxes, setAllBoxes] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [exteriorUploading, setExteriorUploading] = useState(false)
  const [contentsUploading, setContentsUploading] = useState(false)
  const [exteriorUrl, setExteriorUrl] = useState(null)
  const [contentsUrl, setContentsUrl] = useState(null)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setError('')
    try {
      const [record, all] = await Promise.all([getContainer(id), listContainers()])
      setBox(record)
      setAllBoxes(all)
      setExteriorUrl(record.exterior_photo_path ? await getSignedPhotoUrl(record.exterior_photo_path) : null)
      setContentsUrl(record.contents_photo_path ? await getSignedPhotoUrl(record.contents_photo_path) : null)
      setItems(await listItems(id))
    } catch (err) {
      setError(err.message)
    }
  }

  const sequence = useMemo(() => {
    if (!box || !allBoxes) return null
    const room = box.room
    if (!room) return null
    const sameRoom = allBoxes.filter((b) => b.room === room)
    const sorted = [...sameRoom].sort((a, b) => (a.box_number || 0) - (b.box_number || 0))
    const position = sorted.findIndex((b) => b.id === box.id)
    return { n: position + 1, m: sorted.length }
  }, [box, allBoxes])

  async function saveField(field, value) {
    setSaving(true)
    setError('')
    try {
      const updated = await updateContainer(id, { [field]: value })
      setBox((b) => ({ ...b, ...updated }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(kind, e) {
    const file = e.target.files[0]
    if (!file) return
    const setUploading = kind === 'exterior' ? setExteriorUploading : setContentsUploading
    const setUrl = kind === 'exterior' ? setExteriorUrl : setContentsUrl
    setUploading(true)
    setError('')
    try {
      const url = await uploadContainerPhoto(householdId, id, kind, file)
      setUrl(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function refreshItem() {
    setItems(await listItems(id))
  }

  async function handleAddItem(name) {
    const record = await createItem(householdId, id, { name })
    setItems((prev) => [...prev, record])
  }

  async function handleAddItems(names) {
    const created = await createItems(
      householdId,
      id,
      names.map((name) => ({ name })),
    )
    setItems((prev) => [...prev, ...created])
  }

  if (error && !box) {
    return (
      <section>
        <p className="error">{error}</p>
        <Link to="/">Back to boxes</Link>
      </section>
    )
  }

  if (!box) return <p>Loading…</p>

  const f = box

  return (
    <section>
      <div className="page-header">
        <h1>{f.box_id || f.name || 'Untitled box'}</h1>
        <Link to="/" className="button">
          Back
        </Link>
      </div>
      {sequence && (
        <p className="sequence">
          {sequence.n} of {sequence.m} in {f.room}
        </p>
      )}
      {saving && <p className="saving-indicator">Saving…</p>}
      {error && <p className="error">{error}</p>}

      <div className="detail-grid">
        <div className="detail-fields">
          <div className="field-block">
            <p className="field-label">Room</p>
            <ChipSelect options={ROOM_OPTIONS} value={f.room || ''} onChange={(v) => saveField('room', v)} />
          </div>

          <div className="field-block">
            <p className="field-label">Status</p>
            <ChipSelect
              options={STATUS_OPTIONS}
              value={f.status || ''}
              onChange={(v) => saveField('status', v)}
              colors={STATUS_COLORS}
            />
          </div>

          <div className="field-block toggle-row">
            <button
              type="button"
              className={`toggle-chip${f.fragile ? ' toggle-chip-active' : ''}`}
              onClick={() => saveField('fragile', !f.fragile)}
              aria-pressed={!!f.fragile}
            >
              🔺 Fragile
            </button>
            <button
              type="button"
              className={`toggle-chip${f.heavy ? ' toggle-chip-active' : ''}`}
              onClick={() => saveField('heavy', !f.heavy)}
              aria-pressed={!!f.heavy}
            >
              🏋️ Heavy
            </button>
          </div>

          <label>
            Packed Date
            <input
              type="date"
              value={f.packed_date || ''}
              onChange={(e) => saveField('packed_date', e.target.value || null)}
            />
          </label>

          <Disclosure label="More details (name, box number, destination, notes)">
            <label>
              Name
              <input
                type="text"
                defaultValue={f.name || ''}
                onBlur={(e) => e.target.value !== (f.name || '') && saveField('name', e.target.value)}
              />
            </label>

            <label>
              Box Number
              <input
                type="number"
                min="1"
                defaultValue={f.box_number ?? ''}
                onBlur={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  if (val !== (f.box_number ?? null)) saveField('box_number', val)
                }}
              />
            </label>

            <label>
              Destination Room
              <select
                value={f.destination_room || ''}
                onChange={(e) => saveField('destination_room', e.target.value)}
              >
                <option value="">—</option>
                {ROOM_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Notes
              <textarea
                defaultValue={f.notes || ''}
                rows={3}
                onBlur={(e) => e.target.value !== (f.notes || '') && saveField('notes', e.target.value)}
              />
            </label>
          </Disclosure>
        </div>

        <div className="detail-photo">
          <div className="photo-block">
            <p className="field-label">Exterior photo</p>
            {exteriorUrl && <img src={exteriorUrl} alt="Box exterior" className="box-photo" />}
            <label className="button button-large">
              {exteriorUploading ? 'Uploading…' : exteriorUrl ? 'Retake exterior photo' : '📷 Exterior photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => handlePhotoUpload('exterior', e)}
                disabled={exteriorUploading}
              />
            </label>
          </div>

          <div className="photo-block">
            <p className="field-label">Contents photo</p>
            {contentsUrl && <img src={contentsUrl} alt="Everything packed inside the box" className="box-photo" />}
            <label className="button button-large">
              {contentsUploading ? 'Uploading…' : contentsUrl ? 'Retake contents photo' : '📷 Contents photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => handlePhotoUpload('contents', e)}
                disabled={contentsUploading}
              />
            </label>
          </div>
        </div>
      </div>

      <hr />

      <ItemsSection items={items} onAddItem={handleAddItem} onAddItems={handleAddItems} onRefreshItem={refreshItem} />
    </section>
  )
}

// Splits a spoken/typed blob like "coffee mugs, cereal bowls and a cutting board"
// into separate item names.
function parseItemNames(text) {
  return text
    .split(/[,;\n]| and (?=[a-z])/gi)
    .map((s) => s.trim().replace(/^(a|an|the)\s+/i, ''))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
}

function ItemsSection({ items, onAddItem, onAddItems, onRefreshItem }) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const speech = useSpeechRecognition()
  const [dictating, setDictating] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      await onAddItem(newName.trim())
      setNewName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  function startDictation() {
    setDictating(true)
    speech.start()
  }

  function stopDictation() {
    speech.stop()
  }

  const preview = dictating || speech.transcript ? parseItemNames(speech.transcript) : []

  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)
    setError('')
    try {
      await onAddItems(preview)
      speech.reset()
      setDictating(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  function handleCancelDictation() {
    speech.stop()
    speech.reset()
    setDictating(false)
  }

  return (
    <div>
      <div className="page-header">
        <h2>Items {items ? `(${items.length})` : ''}</h2>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="New item name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="button primary" disabled={adding}>
          {adding ? 'Adding…' : '+ Add Item'}
        </button>
        {speech.supported && !dictating && (
          <button type="button" className="button" onClick={startDictation}>
            🎤 Dictate items
          </button>
        )}
      </form>

      {dictating && (
        <div className="voice-panel">
          <div className="voice-panel-header">
            <span className={speech.listening ? 'voice-live' : 'voice-idle'}>
              {speech.listening ? '● Listening…' : 'Stopped'}
            </span>
            {speech.listening ? (
              <button type="button" className="button small" onClick={stopDictation}>
                Stop
              </button>
            ) : (
              <button type="button" className="button small" onClick={() => speech.resume()}>
                Resume
              </button>
            )}
          </div>
          <p className="voice-hint">
            Say what's in the box, e.g. "coffee mugs, cereal bowls, cutting board". Pause between
            items — each phrase becomes its own item below.
          </p>
          <textarea
            rows={3}
            value={speech.transcript}
            onChange={(e) => speech.setTranscript(e.target.value)}
            placeholder="Transcript will appear here — you can also edit it directly."
          />
          {speech.error && <p className="error">{speech.error}</p>}

          {preview.length > 0 && (
            <div className="voice-preview">
              <p className="field-label">Will add {preview.length} item(s):</p>
              <ul className="voice-preview-list">
                {preview.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-row">
            <button
              type="button"
              className="button primary"
              onClick={handleImport}
              disabled={preview.length === 0 || importing}
            >
              {importing ? 'Adding…' : `Add ${preview.length || ''} item(s)`}
            </button>
            <button type="button" className="button" onClick={handleCancelDictation}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {items === null && <p>Loading items…</p>}
      {items && items.length === 0 && <p>No items in this box yet.</p>}

      <ul className="item-list">
        {items?.map((item) => (
          <ItemCard key={item.id} item={item} onRefresh={() => onRefreshItem(item.id)} />
        ))}
      </ul>
    </div>
  )
}

function ItemCard({ item, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name || '')
  const [notes, setNotes] = useState(item.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateItem(item.id, { name, notes })
      await onRefresh()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="item-card">
      {editing ? (
        <div className="item-edit">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          <div className="form-row">
            <button type="button" className="button primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="item-card-top">
            <strong>{item.name || 'Untitled item'}</strong>
            <button type="button" className="button small" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
          {item.notes && <p className="item-notes">{item.notes}</p>}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </li>
  )
}
