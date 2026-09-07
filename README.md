# Moving Master

Frontend for inventorying boxes and items ahead of a move, backed by an Airtable base.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `AIRTABLE_TOKEN` — a personal access token from https://airtable.com/create/tokens with `data.records:read` and `data.records:write` scopes on your base
- `AIRTABLE_BASE_ID` — the base ID (starts with `app...`)

```bash
npm run dev
```

## Architecture

The browser never talks to Airtable directly. Requests go to same-origin
`/api/*` routes (see `/api`), which hold `AIRTABLE_TOKEN`/`AIRTABLE_BASE_ID`
server-side and proxy to the real Airtable API. Locally, a Vite dev-server
middleware (`vite.config.js`) runs that same proxy logic (`api/_lib/airtableProxy.js`)
so `npm run dev` alone exercises the full stack — no Vercel CLI/login needed
for day-to-day development. In production (Vercel), the files under `/api`
deploy as serverless functions automatically; set `AIRTABLE_TOKEN` and
`AIRTABLE_BASE_ID` as project environment variables there (not prefixed with
`VITE_`, so they're never bundled into client code).
