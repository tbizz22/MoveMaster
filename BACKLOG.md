# Backlog

Working sequence for the mobile-first data-entry push: auto-increment box
numbers → default packed date → mobile layout pass → box photos rework.
Item search, label printing, server-side keys, AI vision, and households are
deferred behind that push. Not otherwise in priority order.

- [x] Auto-increment Box Number/Box ID — computed per-room from existing boxes on the New Box form; no longer a manual field.
- [x] Packed Date defaults to the current date instead of blank (New Box form).
- [x] Optimize the UI for fast inline entry on mobile — Room/Status are now one-tap chip pickers (with status color), Fragile/Heavy are large toggle buttons, secondary fields (name, box number, destination, notes) collapse behind a "More details" disclosure, and New Box has a full-width sticky Create button. 44px+ touch targets and 16px input font (no iOS zoom) below 480px.
- [x] Two photos per box instead of per-item: added a "Photo of Contents" attachment field to the Container table (alongside the existing "Photo of Box" exterior field); Box Detail now shows Exterior photo / Contents photo as two separate capture buttons (using `capture="environment"` to open the rear camera directly on mobile). Removed the per-item photo upload control from item cards — legacy item photos/AI summaries still display if present, but new items no longer prompt for a photo.
- [ ] Search for an item by name across all boxes, to find which box it's packed in.
- [ ] Support printing box labels to a 4x6 label printer (matching the validated label design: room-color band, Box ID, contents summary, QR code, "N of M" sequence, destination room, Fragile/Heavy/this-side-up badges, "if found contact" line, packed date).
- [x] Server support for hosted & secure key management — added `/api` serverless functions (`api/health.js`, `api/airtable/upload.js`, `api/airtable/[...path].js`, sharing core logic in `api/_lib/airtableProxy.js`) that hold `AIRTABLE_TOKEN`/`AIRTABLE_BASE_ID` server-side and proxy all Airtable calls; the browser now only talks to same-origin `/api/*`. A Vite dev middleware mirrors the same proxy locally so `npm run dev` still works end-to-end without the Vercel CLI. Deploys as Vercel serverless functions automatically — set `AIRTABLE_TOKEN`/`AIRTABLE_BASE_ID` as Vercel project env vars (not `VITE_`-prefixed). Note: Vercel's default request body size limit (~4.5MB) may reject very large phone photos on the upload endpoint — worth revisiting (client-side image compression) if that comes up.
- [ ] AI vision-based item extraction: photo of a box's contents → detect distinct items via a vision model (e.g. Claude) → bulk-create Item records for review/edit, instead of typing or dictating each one.
- [ ] User and household management — support multiple users belonging to a single household, with shared access to that household's boxes/items.
