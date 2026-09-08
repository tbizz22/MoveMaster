import { handleRecords } from '../_lib/airtableProxy.js'

export default function handler(req, res) {
  // Vercel's Node runtime (no framework preset) names this catch-all
  // segment's query key literally "...path" (dots included), not "path" —
  // confirmed via a raw req.query dump against the deployed function.
  // Falling back to "path" too in case that ever changes.
  const rawSegments = req.query['...path'] ?? req.query.path
  const segments = Array.isArray(rawSegments) ? rawSegments : [rawSegments]

  const { searchParams } = new URL(req.url, 'http://localhost')
  searchParams.delete('...path')
  searchParams.delete('path')

  return handleRecords(req, res, segments, searchParams)
}
