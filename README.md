# MemoryVerse – A Digital Universe of Memories

Save your memories, seal letters to your future self, and see how humanity's dreams change over time.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4) · Supabase (Postgres, Auth, Storage, RLS) · Vercel

## Features (v0.1 — week 1)
- Email/password accounts (Supabase Auth)
- **Memory Vault** — capsules with text, photo, voice or video, emotion, place, topic; timeline grouped by year
- **Future Capsules** — sealed until a chosen date. Sealing is enforced in the database (Row Level Security + `list_my_capsules()` hides content), not just in the UI
- "Then vs Now" view with an epilogue when a capsule opens
- Free plan limit (50 capsules) enforced by a database trigger
- Private media storage with per-user folders and signed URLs
- **Humanity Map** (week 2) — 100k+ real moments (HappyDB) on a world map, colored by emotion; country stats from
  materialized views; full-text search; anonymous sharing of public memory capsules via a database trigger
- **Admin panel** (`/admin`) — batched dataset import with progress, protected by an `admin` role checked in the database
- Time Analytics — in development

## Data sources
- HappyDB — Asai, A., Evensen, S., Golshan, B., Halevy, A., Li, V., Lopatenko, A., Stepanov, D., Suhara, Y., Tan, W.-C., Xu, Y. (2018). *HappyDB: A Corpus of 100,000 Crowdsourced Happy Moments.* LREC 2018. Emotions are derived from HappyDB's categories plus keyword rules.
- Country shapes — Natural Earth (public domain)

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

## Database setup
Supabase Dashboard → **SQL Editor** → run each file in `supabase/migrations/` in order (0001, 0002, 0003…).

## Deploy
Import the GitHub repo in Vercel and add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.
Then in Supabase → Authentication → URL Configuration set **Site URL** to your Vercel URL and add
`https://YOUR-APP.vercel.app/auth/callback` to **Redirect URLs**.
