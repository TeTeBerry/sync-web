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
| `DATABASE_URL` or `POSTGRES_URL` | Waitlist + Raven auth Postgres |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (required on CloudBase; optional on Vercel if `VERCEL_*` fallback is enough) |
| `TEMP_EMAIL_ONLY_AUTH_ENABLED` (+ `NEXT_PUBLIC_…`) | Email login gate in production |
| `RESEND_API_KEY` | Optional waitlist email |

Waitlist / auth tables are created on first successful use when Postgres is configured. Vercel Analytics remains enabled on the Vercel deploy.

Backend reads used by the app:

- `GET /api/activities`
- `GET /api/activities/:legacyId`
- `GET /api/posts?activityLegacyId=:legacyId&limit=6`

Fallback data remains when the backend is offline.
