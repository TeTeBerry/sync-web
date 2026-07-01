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

Set `NEXT_PUBLIC_API_BASE_URL` to the backend API root. The app includes fallback data so the UI can still be reviewed when the backend is offline.
