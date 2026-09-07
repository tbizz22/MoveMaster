import { handleRecords } from '../_lib/airtableProxy.js'

export default function handler(req, res) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const { searchParams } = new URL(req.url, 'http://localhost')
  return handleRecords(req, res, segments, searchParams)
}
