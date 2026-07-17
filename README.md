# Raven Web MVP

Thin Next.js public web surface for validating Raven before the mini program review finishes.

## Scope

- Home
- Activity list
- Activity detail
- Public recruit preview
- Festival discovery and trip planning

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

## Authentication

Raven currently uses Auth.js with Google only (`openid email profile`). Copy `.env.example` to `.env.local`, set `MONGODB_URI`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and the shared `INTERNAL_API_KEY`. OAuth secrets are server-only. If the server network cannot reach Google's default token endpoint, set `AUTH_GOOGLE_TOKEN_URL` and `AUTH_GOOGLE_USERINFO_URL` to reachable Google-compatible endpoints.

In Google Cloud Console add these redirect URIs:

- `http://localhost:3002/api/auth/callback/google`
- `https://raventribe.tech/api/auth/callback/google`

Use the actual production hostname if it differs. Do not add Calendar, Drive, Gmail, Contacts, YouTube, or location scopes.

## Deployment (Vercel + CloudBase)

Full Raven needs **Node** on both sides:

| Target | How |
|--------|-----|
| **Vercel** | Git integration (SSR + Route Handlers). Prod URL e.g. `https://raven-ashen-mu.vercel.app`. |
| **CloudBase 云托管** | `Dockerfile` → standalone `node server.js`. Not 静态网站托管. |

**Env reference (required / optional / build vs runtime / per-target checklists):** see **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

Short version for both targets:

| Variable | Role |
|----------|------|
| `API_BASE_URL` | Nest API root (`…/api`) |
| `MONGODB_URI` | Raven Auth.js MongoDB (isolated `raven_auth_*` collections) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (required on CloudBase; optional on Vercel if `VERCEL_*` fallback is enough) |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Server-side Auth.js configuration |
Auth.js collections are created on first successful use. Vercel Analytics remains enabled on the Vercel deploy; it is listed on the Privacy page.

Backend reads used by the app:

- `GET /api/activities`
- `GET /api/activities/:legacyId`
- `GET /api/posts?activityLegacyId=:legacyId&limit=6`

Fallback data remains when the backend is offline.
