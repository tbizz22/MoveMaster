# Backlog

Not in priority order except where noted.

- [x] Auto-increment Box Number/Box ID — computed per-room from existing boxes on the New Box form; no longer a manual field.
- [x] Packed Date defaults to the current date instead of blank (New Box form).
- [x] Optimize the UI for fast inline entry on mobile — Room/Status are now one-tap chip pickers (with status color), Fragile/Heavy are large toggle buttons, secondary fields (name, box number, destination, notes) collapse behind a "More details" disclosure, and New Box has a full-width sticky Create button. 44px+ touch targets and 16px input font (no iOS zoom) below 480px.
- [x] Two photos per box instead of per-item: containers have separate exterior/contents photos (using `capture="environment"` to open the rear camera directly on mobile); per-item photo capture was dropped.
- [x] Server support for hosted & secure key management, **superseded by a full migration to Supabase** (see below) — Postgres Row Level Security replaced the hand-rolled `/api` Airtable proxy entirely, which is a stronger guarantee than an API-layer guard would have been.
- [x] User and household management — full Supabase migration (see below): email/password auth, households with a shareable join code so multiple users share one household's inventory. Went beyond the Coaster Tracker project's current state (which has the RLS schema for multi-member households but no actual invite/join UI) by building the invite-code flow.
- [ ] Search for an item by name across all boxes, to find which box it's packed in. Groundwork already in place: `items.name` has a GIN full-text index (`supabase/migrations/00000000000001_schema.sql`) and `searchItems()` exists in `src/lib/db.js` — just needs a UI entry point.
- [ ] Support printing box labels to a 4x6 label printer (matching the validated label design: room-color band, Box ID, contents summary, QR code, "N of M" sequence, destination room, Fragile/Heavy/this-side-up badges, "if found contact" line, packed date).
- [ ] AI vision-based item extraction: photo of a box's contents → detect distinct items via a vision model (e.g. Claude) → bulk-create Item records for review/edit, instead of typing or dictating each one.

## Migrated off Airtable to Supabase (2026-09-08)

The app originally stored box/item data in Airtable, proxied through Vercel
serverless functions to keep the API token off the client. When household
accounts were added, replicating Airtable's data isolation would have meant
hand-rolling household-membership checks in that proxy layer (Airtable has
no Row Level Security equivalent) — real, ongoing security-review surface
every time the API changed.

Instead, all inventory data (`containers`, `items`) and photos moved to
Supabase (Postgres + Storage), alongside the new households/auth. RLS
policies (keyed off a `household_members` table, same shape as the Coaster
Tracker project) now enforce access at the database level instead of in
application code — the client talks to Supabase directly with the anon key.
The `/api` Airtable proxy and `src/lib/airtable.js` were removed entirely.
The original Airtable base still exists as a historical reference but is no
longer read from.

Follow-up: existing pre-migration boxes (KIT-099, LIV-001, etc.) that lived
in Airtable were **not** carried over to Supabase — that data is still only
in the Airtable base if it's still wanted.
