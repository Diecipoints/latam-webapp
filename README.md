# LATAM Manager — HR & OKR Platform

Internal web app for managing collaborators, objectives, and results across Latin American regions.

## Stack

- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend** — Supabase (PostgreSQL + Row Level Security)
- **Routing** — React Router v7
- **Forms** — React Hook Form + Zod

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in env vars
cp .env.example .env

# 3. Start dev server
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-side only, never exposed to browser |

## Build & deploy

```bash
npm run build   # outputs to dist/
npm run preview # preview production build locally
```

For deployment to Vercel: connect the repo, set the three env vars in project settings, and deploy. The `vercel.json` in the repo handles SPA routing rewrites automatically.

## Database

Migration and seed files are in `supabase/`. To apply to a fresh project:

```bash
# Apply schema
psql $DATABASE_URL < supabase/migration.sql

# Optional: load seed data
psql $DATABASE_URL < supabase/seed.sql
```
