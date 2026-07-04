# Raven Web MVP

Thin Next.js public web surface for validating Raven before the mini program review finishes.

## Scope

- Home
- Activity list
- Activity detail
- Public recruit preview
- Waitlist / update subscription intent

## Local Dev

```bash
npm install
npm run dev
```

Dev server runs at **http://localhost:3002** (port 3000 is reserved for `sync-app-backend`).

If Turbopack shows a stale cache warning, reset with:

```bash
npm run dev:clean
```

Set `API_BASE_URL` to the backend API root for server-rendered reads. Production currently points at `https://sync-backend-prd-269371-9-1442514260.sh.run.tcloudbase.com/api`; local backend dev can use `http://127.0.0.1:3000/api`.

## Vercel Deployment

Deploy the MVP to Vercel. Production URL is assigned automatically (currently `https://raven-ashen-mu.vercel.app`). Metadata, canonical URLs, `robots.txt`, and `sitemap.xml` use `VERCEL_PROJECT_PRODUCTION_URL`.

Required production environment variables:

- `API_BASE_URL`: backend API root for activity and recruit reads.
- `DATABASE_URL`: optional local override. On Vercel with the Supabase integration, `POSTGRES_URL` is injected automatically and used at runtime.
- `NEXT_PUBLIC_SITE_URL`: optional override for site URL. When unset, production uses `VERCEL_PROJECT_PRODUCTION_URL`.

Optional production environment variables:

- `RESEND_API_KEY`: enables email notification for waitlist submissions after the database write succeeds.

Waitlist submissions are stored in Supabase Postgres (`waitlist_submissions`). The API creates the table on first successful request, so no separate migration command is required for the MVP.

Vercel Analytics is enabled in the root layout. It records page views plus key conversion events such as home event clicks, event subscribe clicks, and waitlist submission results.

The app currently consumes read-only backend APIs:

- `GET /api/activities`
- `GET /api/activities/:legacyId`
- `GET /api/posts?activityLegacyId=:legacyId&limit=6`

Fallback data remains in place so the UI can still be reviewed when the backend is offline.
