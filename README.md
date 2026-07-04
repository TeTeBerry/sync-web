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

Set `API_BASE_URL` to the backend API root for server-rendered reads. Production currently points at `https://sync-backend-prd-269371-9-1442514260.sh.run.tcloudbase.com/api`; local backend dev can use `http://127.0.0.1:3000/api`. `NEXT_PUBLIC_API_BASE_URL` is kept as a fallback for compatibility.

## Vercel Deployment

Deploy the MVP to Vercel with the custom production domain `https://www.ravenclub.tech`. Metadata, canonical URLs, `robots.txt`, and `sitemap.xml` must use this custom domain, not the generated `*.vercel.app` URL.

Required production environment variables:

- `API_BASE_URL`: backend API root for activity and recruit reads.
- `NEXT_PUBLIC_SITE_URL`: optional local/preview override. Production falls back to `https://www.ravenclub.tech`.
- `DATABASE_URL`: Postgres connection string from the Vercel Marketplace Neon/Postgres integration.

Optional production environment variables:

- `RESEND_API_KEY`: enables email notification for waitlist submissions after the database write succeeds.

Waitlist submissions are stored in `waitlist_submissions`. The API creates the table on first successful request, so no separate migration command is required for the MVP.

Vercel Analytics is enabled in the root layout. It records page views plus key conversion events such as home event clicks, event subscribe clicks, and waitlist submission results.

The app currently consumes read-only backend APIs:

- `GET /api/activities`
- `GET /api/activities/:legacyId`
- `GET /api/posts?activityLegacyId=:legacyId&limit=6`

Fallback data remains in place so the UI can still be reviewed when the backend is offline.
