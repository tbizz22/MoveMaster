# Moving Master

Frontend for inventorying boxes and items ahead of a move, with per-household
accounts so everyone moving together shares the same inventory.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` from your Supabase project (Project Settings → API):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Apply the schema (tables, RLS policies, household RPCs) to your project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

```bash
npm run dev
```

## Architecture

**Auth + data**: Supabase Auth (email/password) for identity, Postgres for
`containers`/`items` data, Supabase Storage for box photos. Row Level
Security scopes every query to the signed-in user's household automatically
(`supabase/migrations/00000000000001_schema.sql`) — the client talks to
Supabase directly with the anon key; there's no backend API layer, because
RLS *is* the authorization layer.

**Households**: signing up creates a profile with no household yet;
`AuthGate.jsx` then prompts to either create a household (`create_household`
RPC) or join an existing one via a shareable join code (`redeem_invite`
RPC). Every box/item is scoped to a `household_id`; anyone in the household
sees and edits the same inventory.

**Box ID** (e.g. `KIT-001`) is derived from room + box number in a Postgres
view (`containers_with_box_id`), not stored — it's always in sync.
