# Temporary email-only auth → email OTP migration

Raven MVP uses **unverified email-only sign-in** so Festival Squad can ship
without passwords, magic links, or OAuth.

## Current model (do not recreate later)

Postgres tables in sync-web:

- `raven_users` — `id`, `email`, `email_normalized` (unique), `email_verified_at` (**null** today), timestamps, `last_login_at`
- `raven_sessions` — server-side sessions; raw token only in httpOnly `raven_sid` cookie

Festival Squad profiles stay **separate** from auth users (localStorage MVP today;
future Nest `festival-squad` module will own `userId` → profile, not email fields).

## Persistence

- **With `DATABASE_URL` / `POSTGRES_URL`:** Postgres tables `raven_users` + `raven_sessions` + `raven_auth_usage`.
- **Local/dev without DB:** automatic in-memory store (sessions reset on server restart).
  One-time console warning: `[auth] DATABASE_URL/POSTGRES_URL is not set — using in-memory auth store…`
- Production must configure Postgres (or explicitly set `AUTH_MEMORY_FALLBACK=true`, not recommended).

## CSRF + Origin

- `GET /api/auth/session` mints the readable `raven_csrf` cookie (bootstrap only).
- Mutations (`email-login`, `logout`, `limits`) **require**:
  - matching `Origin` (missing Origin → 403)
  - matching `x-csrf-token` header (no CSRF cookie → 403; no bootstrap-on-POST)
- Client calls `ensureAuthCsrf()` (via session GET) before login/logout/limits.

## Squad ownership

Squad Profile `userId` is bound to authenticated `raven_users.id` on create and on login
(`bindSquadProfileToAuthUser`). Profiles remain separate documents; they are not stored on the auth user row.

## Unverified usage limits (server-side)

`POST /api/auth/limits` with `{ kind: 'connection_request' | 'private_profile_view' }`
enforces configurable daily/hourly caps keyed by authenticated user id (not localStorage).

## Capability layer

Use `buildAuthCapabilities(emailVerifiedAt)` / `hasCapability(...)`.

Unverified (`emailVerifiedAt === null`) may:

- create/edit Squad Profile, browse matches, send limited connection requests, view sent requests, log out

Unverified must not:

- messaging, phone fields, payments / AA, booking confirmation publish, sensitive roommate verification

When OTP lands, set `emailVerifiedAt` and the same helpers unlock those capabilities — no scattered `emailVerifiedAt` checks.

## Future email OTP migration (same user + same session type)

1. User enters email (reuse `EmailLoginForm` / `normalizeEmail`)
2. Send verification code (new mailer; not part of this MVP)
3. Verify the code server-side
4. `UPDATE raven_users SET email_verified_at = NOW()` for that row
5. Create the **same** session type (`raven_sessions` + `raven_sid` cookie rotation)
6. Continue using the same `raven_users.id` as the Festival Squad owner key

Do **not**:

- recreate users
- change Squad profile ownership
- introduce a separate OTP-only user table

Optional later providers (Google / Apple) should link to the same `raven_users` row via provider subject columns, still keyed by `id`.

## Backend alignment

`sync-app-backend` User schema includes `email` / `emailNormalized` / `emailVerifiedAt` /
`lastLoginAt` and `POST /api/auth/email-login` (JWT + tokenVersion) behind
`TEMP_EMAIL_ONLY_AUTH_ENABLED` for Nest API consumers. Raven web MVP sessions
are owned by sync-web cookies; unify IDs when Festival Squad APIs move to Nest.

## Feature flag

- `TEMP_EMAIL_ONLY_AUTH_ENABLED` (server)
- `NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED` (client unavailable UI)

Production must set these explicitly to `true`. When disabled, show a controlled
unavailable state — do not fail silently.
