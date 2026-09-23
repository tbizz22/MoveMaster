import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { listContainers, listItems, updateHouseholdContact } from '../lib/db'
import { useHousehold } from '../lib/HouseholdContext'
import Label from '../components/Label'

// Deep link a scanned label opens to: the box's detail page in this app.
function boxUrl(id) {
  return `${window.location.origin}${window.location.pathname}#/boxes/${id}`
}

function ContactInfoEditor({ householdId, contactInfo, onSaved }) {
  const [value, setValue] = useState(contactInfo || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      await updateHouseholdContact(householdId, value.trim() || null)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="no-print contact-editor">
      <label>
        "If found" contact line (printed on every label)
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Jamie Smith · (555) 123-4567"
        />
      </label>
      <button type="button" className="button small" onClick={save} disabled={saving || value === (contactInfo || '')}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default function PrintLabels() {
  const [searchParams] = useSearchParams()
  const { householdId, contactInfo, refresh } = useHousehold()
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean)

  const [boxes, setBoxes] = useState(null)
  const [itemsByBox, setItemsByBox] = useState({})
  const [qrByBox, setQrByBox] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      try {
        const all = await listContainers()
        const selected = all.filter((b) => ids.includes(b.id))
        const sequences = {}
        for (const box of selected) {
          if (!box.room) continue
          const sameRoom = all
            .filter((b) => b.room === box.room)
            .sort((a, b) => (a.box_number || 0) - (b.box_number || 0))
          const position = sameRoom.findIndex((b) => b.id === box.id)
          sequences[box.id] = { n: position + 1, m: sameRoom.length }
        }
        const withSequence = selected.map((b) => ({ ...b, sequence: sequences[b.id] || null }))
        if (cancelled) return
        setBoxes(withSequence)

        const itemLists = await Promise.all(selected.map((b) => listItems(b.id)))
        if (cancelled) return
        const itemsMap = {}
        selected.forEach((b, i) => (itemsMap[b.id] = itemLists[i]))
        setItemsByBox(itemsMap)

        const qrEntries = await Promise.all(
          selected.map(async (b) => [b.id, await QRCode.toDataURL(boxUrl(b.id), { width: 240, margin: 1 })]),
        )
        if (cancelled) return
        setQrByBox(Object.fromEntries(qrEntries))
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <section>
      <div className="page-header no-print">
        <h1>Print Labels</h1>
        <div className="form-row" style={{ gap: 8 }}>
          <button type="button" className="button primary" onClick={() => window.print()} disabled={!boxes?.length}>
            🖨️ Print
          </button>
          <Link to="/" className="button">
            Back
          </Link>
        </div>
      </div>

      <div className="no-print">
        <ContactInfoEditor householdId={householdId} contactInfo={contactInfo} onSaved={refresh} />
      </div>

      {error && <p className="error no-print">{error}</p>}
      {ids.length === 0 && <p className="no-print">No boxes selected.</p>}
      {boxes === null && ids.length > 0 && !error && <p className="no-print">Loading labels…</p>}
      {boxes && boxes.length === 0 && ids.length > 0 && (
        <p className="no-print">None of the selected boxes could be found.</p>
      )}

      <div className="label-sheet">
        {boxes?.map((box) => (
          <Label key={box.id} box={box} items={itemsByBox[box.id]} qrDataUrl={qrByBox[box.id]} contactInfo={contactInfo} />
        ))}
      </div>
    </section>
  )
}
