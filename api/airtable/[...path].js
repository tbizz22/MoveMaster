import { handleRecords } from '../_lib/airtableProxy.js'

export default function handler(req, res) {
  // TEMPORARY: dump the raw query object to find the actual key Vercel uses
  // for this catch-all route — req.query.path is coming back undefined in
  // production. Remove once resolved.
  if (req.query.debugQuery !== undefined) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ rawQuery: req.query, url: req.url }))
    return
  }

  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const { searchParams } = new URL(req.url, 'http://localhost')
  return handleRecords(req, res, segments, searchParams)
}
