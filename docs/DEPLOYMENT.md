# Dual deployment (Vercel + CloudBase 云托管)

Raven (`sync-web`) ships the **same Next.js app** to two Node hosts:

| Target | Runtime | Typical audience |
|--------|---------|------------------|
| **Vercel** | Platform SSR + Route Handlers | Overseas / brand URL |
| **CloudBase 云托管** | Docker → `node server.js` (`output: 'standalone'`) | China / ICP domain |

Do **not** use CloudBase 静态网站托管 — auth, waitlist, plan, lineup, and squad need Node.

Sessions and cookies are **per hostname**. Users signing in on the CN domain do not share cookies with the Vercel domain (expected).

---

## Env matrix

### Required (both targets)

| Variable | When | Notes |
|----------|------|--------|
| `API_BASE_URL` | **Runtime** | Nest backend root ending in `/api`. Prod example: `https://sync-backend-prd-….sh.run.tcloudbase.com/api`. Used for SSR reads and BFF proxies. |
| `DATABASE_URL` **or** `POSTGRES_URL` **or** `POSTGRES_PRISMA_URL` | **Runtime** | Postgres for waitlist + Raven auth/sessions/usage. First non-empty wins (`lib/db.ts`). Production must set one of these. |
| `NEXT_PUBLIC_SITE_URL` | **Build + runtime** (see below) | Canonical site origin, no trailing slash. Used by metadata, sitemap, robots. |

### Strongly recommended (both)

| Variable | When | Notes |
|----------|------|--------|
| `TEMP_EMAIL_ONLY_AUTH_ENABLED` | Runtime | Production defaults **off** unless set to `true` / `1` / `yes`. |
| `NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED` | **Build** (and runtime on server) | Same flag for client UI. Set `true` on both targets if email login should show. |
| `RESEND_API_KEY` | Runtime | Waitlist email notify after DB write. Omit to skip mail. |

### Optional (both)

| Variable | Default / behavior |
|----------|-------------------|
| `NEXT_PUBLIC_API_BASE_URL` | Fallback if `API_BASE_URL` unset (prefer server-only `API_BASE_URL`). |
| `AUTH_MEMORY_FALLBACK` | `true` forces in-memory auth (dev only; not for prod). |
| `WAITLIST_SOCIAL_PROOF_MIN` | Social-proof threshold override. |
| `WAITLIST_HERO_PROOF_MIN` | Hero proof threshold override. |
| `TEMP_AUTH_LOGIN_IP_MAX` | Login rate limit per IP (default `20`). |
| `TEMP_AUTH_LOGIN_IP_WINDOW_MS` | IP window ms (default `900000`). |
| `TEMP_AUTH_LOGIN_EMAIL_MAX` | Per-email login max (default `10`). |
| `TEMP_AUTH_LOGIN_EMAIL_WINDOW_MS` | Email window ms (default `900000`). |
| `TEMP_AUTH_LOGIN_SUSPICIOUS_IP` | Suspicious IP log threshold (default `12`). |
| `TEMP_AUTH_MAX_CONNECTION_REQUESTS_PER_DAY` | Unverified squad connection cap. |
| `TEMP_AUTH_MAX_PRIVATE_PROFILE_VIEWS_PER_HOUR` | Unverified private profile view cap. |

### Platform-injected (do not set manually)

| Variable | Platform | Notes |
|----------|----------|--------|
| `VERCEL_ENV` | Vercel | Used by `getSiteUrl()` when `NEXT_PUBLIC_SITE_URL` is unset. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel | Production canonical fallback. |
| `VERCEL_URL` | Vercel | Preview deployment host fallback. |
| `POSTGRES_URL` / `POSTGRES_PRISMA_URL` | Vercel DB integration | Often injected automatically; still counts as the DB URL. |
| `PORT` / `HOSTNAME` | CloudBase image | Dockerfile defaults `PORT=3000`, `HOSTNAME=0.0.0.0`. Override `PORT` if the云托管 service expects another port. |
| `NODE_ENV` | Both | Set `production` in prod. |

---

## Per-target checklist

### Vercel

Set in Project → Settings → Environment Variables (Production / Preview as needed):

```text
API_BASE_URL=https://sync-backend-prd-….sh.run.tcloudbase.com/api
NEXT_PUBLIC_SITE_URL=https://raven-ashen-mu.vercel.app   # or custom domain
DATABASE_URL=…   # or rely on integration POSTGRES_URL
TEMP_EMAIL_ONLY_AUTH_ENABLED=true
NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED=true
RESEND_API_KEY=…   # optional
```

- If `NEXT_PUBLIC_SITE_URL` is omitted in production, `getSiteUrl()` falls back to `VERCEL_PROJECT_PRODUCTION_URL`.
- Prefer still setting `NEXT_PUBLIC_SITE_URL` explicitly when using a custom domain.

### CloudBase 云托管

**Build args** (inlined into the client bundle — rebuild when they change):

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://你的备案域名 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://sync-backend-prd-….sh.run.tcloudbase.com/api \
  --build-arg NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED=true \
  -t sync-web:prd .
```

`Dockerfile` wires these as build `ARG`/`ENV`: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED`. Add more `ARG`/`ENV` pairs if other public vars are needed.

**Runtime env** (云托管服务配置 / secrets):

```text
API_BASE_URL=https://sync-backend-prd-….sh.run.tcloudbase.com/api
NEXT_PUBLIC_SITE_URL=https://你的备案域名
DATABASE_URL=…          # must be reachable from the CN container
TEMP_EMAIL_ONLY_AUTH_ENABLED=true
RESEND_API_KEY=…        # optional
PORT=3000               # or whatever the service listens on
```

Critical differences vs Vercel:

1. **`NEXT_PUBLIC_SITE_URL` is required** — there is no `VERCEL_*` fallback; missing it yields `http://localhost:3002` in metadata.
2. **Postgres must be reachable from China** — if Neon/overseas latency fails auth/waitlist, use a CN-reachable Postgres (or move those writes behind the existing CloudBase backend later).
3. Use **云托管 / Cloud Run**, not 静态网站托管. Image entrypoint: `node server.js` (standalone).

---

## Build-time vs runtime

| Kind | Examples | Rule |
|------|----------|------|
| `NEXT_PUBLIC_*` | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED` | Baked at **build**. Different CN vs Vercel values ⇒ separate builds (Vercel project env vs Docker `--build-arg`). |
| Server-only | `API_BASE_URL`, `DATABASE_URL`, `RESEND_API_KEY`, `TEMP_EMAIL_ONLY_AUTH_ENABLED` | Safe to change at **runtime** without rebuild (CloudBase service env / Vercel env + redeploy). |

---

## Local development

```bash
API_BASE_URL=http://127.0.0.1:3000/api npm run dev
```

- Dev server: `http://localhost:3002`
- Without DB URL: auth uses in-memory store (sessions reset on restart)
- Email auth defaults **on** when unset in non-production

See also [TEMP_EMAIL_AUTH.md](./TEMP_EMAIL_AUTH.md).

---

## Smoke after deploy (each hostname)

1. Home / events list load (SSR → `API_BASE_URL`)
2. Waitlist submit (Postgres)
3. Email login + session cookie
4. Plan / lineup / squad flows that hit `app/api/*` and backend
