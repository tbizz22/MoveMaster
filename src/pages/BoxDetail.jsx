import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getRecord,
  listAllRecords,
  updateRecord,
  createRecord,
  uploadAttachment,
} from '../lib/airtable'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
import {
  CONTAINER_TABLE_ID,
  ITEMS_TABLE_ID,
  CONTAINER_PHOTO_FIELD_ID,
  ITEM_PHOTO_FIELD_ID,
  ROOM_OPTIONS,
  STATUS_OPTIONS,
} from '../lib/constants'

export default function BoxDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [box, setBox] = useState(null)
  const [allBoxes, setAllBoxes] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setError('')
    try {
      const [record, all] = await Promise.all([
        getRecord(CONTAINER_TABLE_ID, id),
        listAllRecords(CONTAINER_TABLE_ID),
      ])
      setBox(record)
      setAllBoxes(all)
      const itemIds = record.fields.Items || []
      if (itemIds.length) {
        const fetched = await Promise.all(itemIds.map((itemId) => getRecord(ITEMS_TABLE_ID, itemId)))
        setItems(fetched)
      } else {
        setItems([])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const sequence = useMemo(() => {
    if (!box || !allBoxes) return null
    const room = box.fields.Room
    if (!room) return null
    const sameRoom = allBoxes.filter((b) => b.fields.Room === room)
    const sorted = [...sameRoom].sort((a, b) => (a.fields['Box Number'] || 0) - (b.fields['Box Number'] || 0))
    const position = sorted.findIndex((b) => b.id === box.id)
    return { n: position + 1, m: sorted.length }
  }, [box, allBoxes])

  async function saveField(field, value) {
    setSaving(true)
    setError('')
    try {
      const updated = await updateRecord(CONTAINER_TABLE_ID, id, { [field]: value })
      setBox((b) => ({ ...b, fields: { ...b.fields, ...updated.fields } }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoUploading(true)
    setError('')
    try {
      await uploadAttachment(CONTAINER_TABLE_ID, id, CONTAINER_PHOTO_FIELD_ID, file)
      const record = await getRecord(CONTAINER_TABLE_ID, id)
      setBox(record)
    } catch (err) {
      setError(err.message)
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  async function refreshItem(itemId) {
    const record = await getRecord(ITEMS_TABLE_ID, itemId)
    setItems((prev) => prev.map((it) => (it.id === itemId ? record : it)))
  }

  async function handleAddItem(name) {
    const record = await createRecord(ITEMS_TABLE_ID, { Name: name, Container: [id] })
    setItems((prev) => [...prev, record])
    setBox((b) => ({ ...b, fields: { ...b.fields, Items: [...(b.fields.Items || []), record.id] } }))
  }

  async function handleAddItems(names) {
    const created = []
    for (const name of names) {
      const record = await createRecord(ITEMS_TABLE_ID, { Name: name, Container: [id] })
      created.push(record)
    }
    setItems((prev) => [...prev, ...created])
    setBox((b) => ({
      ...b,
      fields: { ...b.fields, Items: [...(b.fields.Items || []), ...created.map((r) => r.id)] },
    }))
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

  const f = box.fields

  return (
    <section>
      <div className="page-header">
        <h1>{f['Box ID'] || f.Name || 'Untitled box'}</h1>
        <Link to="/" className="button">
          Back
        </Link>
      </div>
      {sequence && (
        <p className="sequence">
          {sequence.n} of {sequence.m} in {f.Room}
        </p>
      )}
      {saving && <p className="saving-indicator">Saving…</p>}
      {error && <p className="error">{error}</p>}

      <div className="detail-grid">
        <div className="detail-fields">
          <label>
            Name
            <input
              type="text"
              defaultValue={f.Name || ''}
              onBlur={(e) => e.target.value !== (f.Name || '') && saveField('Name', e.target.value)}
            />
          </label>

          <div className="form-row">
            <label>
              Room
              <select value={f.Room || ''} onChange={(e) => saveField('Room', e.target.value)}>
                <option value="">—</option>
                {ROOM_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destination Room
              <select
                value={f['Destination Room'] || ''}
                onChange={(e) => saveField('Destination Room', e.target.value)}
              >
                <option value="">—</option>
                {ROOM_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Box Number
              <input
                type="number"
                min="1"
                defaultValue={f['Box Number'] ?? ''}
                onBlur={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  if (val !== (f['Box Number'] ?? null)) saveField('Box Number', val)
                }}
              />
            </label>
            <label>
              Status
              <select value={f.Status || ''} onChange={(e) => saveField('Status', e.target.value)}>
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
                checked={!!f.Fragile}
                onChange={(e) => saveField('Fragile', e.target.checked)}
              />
              Fragile
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!f.Heavy}
                onChange={(e) => saveField('Heavy', e.target.checked)}
              />
              Heavy
            </label>
          </div>

          <label>
            Packed Date
            <input
              type="date"
              value={f['Packed Date'] || ''}
              onChange={(e) => saveField('Packed Date', e.target.value || null)}
            />
          </label>

          <label>
            Notes
            <textarea
              defaultValue={f.Notes || ''}
              rows={3}
              onBlur={(e) => e.target.value !== (f.Notes || '') && saveField('Notes', e.target.value)}
            />
          </label>
        </div>

        <div className="detail-photo">
          <p className="field-label">Photo of Box</p>
          {(f['Photo of Box'] || []).map((att) => (
            <img key={att.id} src={att.thumbnails?.large?.url || att.url} alt={f.Name || 'Box'} className="box-photo" />
          ))}
          <label className="button">
            {photoUploading ? 'Uploading…' : 'Upload photo'}
            <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} disabled={photoUploading} />
          </label>
        </div>
      </div>

      <hr />

      <ItemsSection
        items={items}
        onAddItem={handleAddItem}
        onAddItems={handleAddItems}
        onRefreshItem={refreshItem}
      />
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
              <button type="button" className="button small" onClick={() => speech.start()}>
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
  const [name, setName] = useState(item.fields.Name || '')
  const [notes, setNotes] = useState(item.fields.Notes || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateRecord(ITEMS_TABLE_ID, item.id, { Name: name, Notes: notes })
      await onRefresh()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadAttachment(ITEMS_TABLE_ID, item.id, ITEM_PHOTO_FIELD_ID, file)
      await onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const f = item.fields

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
            <strong>{f.Name || 'Untitled item'}</strong>
            <button type="button" className="button small" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
          {f.Notes && <p className="item-notes">{f.Notes}</p>}
          {f['Summary (Photo of Item(s))']?.value && (
            <p className="item-ai-summary">{f['Summary (Photo of Item(s))'].value}</p>
          )}
          {(f['Photo of Item(s)'] || []).map((att) => (
            <img
              key={att.id}
              src={att.thumbnails?.small?.url || att.url}
              alt={f.Name || 'Item'}
              className="item-photo"
            />
          ))}
          <label className="button small">
            {uploading ? 'Uploading…' : 'Upload photo'}
            <input type="file" accept="image/*" hidden onChange={handlePhoto} disabled={uploading} />
          </label>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </li>
  )
}
