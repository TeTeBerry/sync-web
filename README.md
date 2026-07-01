# SYNC Web MVP

Thin Next.js public web surface for validating SYNC before the mini program review finishes.

## Scope

- Home
- Activity list
- Activity detail
- Public recruit preview
- Waitlist / update subscription intent

## Local Dev

```bash
pnpm install
pnpm --filter sync-web dev
```

Set `API_BASE_URL` to the backend API root for server-rendered reads. Production currently points at `https://sync-backend-prd-269371-9-1442514260.sh.run.tcloudbase.com/api`; local backend dev can use `http://127.0.0.1:3000/api`. `NEXT_PUBLIC_API_BASE_URL` is kept as a fallback for compatibility.

The app currently consumes read-only backend APIs:

- `GET /api/activities`
- `GET /api/activities/:legacyId`
- `GET /api/posts?activityLegacyId=:legacyId&limit=6`

Fallback data remains in place so the UI can still be reviewed when the backend is offline.
