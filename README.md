# Moving Master

Frontend for inventorying boxes and items ahead of a move, backed by an Airtable base.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `VITE_AIRTABLE_TOKEN` — a personal access token from https://airtable.com/create/tokens with `data.records:read` and `data.records:write` scopes on your base
- `VITE_AIRTABLE_BASE_ID` — the base ID (starts with `app...`)
- `VITE_AIRTABLE_BOXES_TABLE` — name of the boxes table (defaults to `Boxes`)

```bash
npm run dev
```

Note: this is a client-side SPA, so the Airtable token ships to the browser. Fine for a
personal tool used locally/on your own network; don't deploy this publicly without moving
Airtable calls behind a server.
