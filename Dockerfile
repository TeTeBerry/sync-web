# Default: DaoCloud mirror (CN). Override: docker build --build-arg NODE_IMAGE=node:20-bookworm-slim .
ARG NODE_IMAGE=docker.m.daocloud.io/library/node:20-bookworm-slim

FROM ${NODE_IMAGE} AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* is inlined at build time — pass per-target values when building
# the CloudBase image (Vercel continues to inject its own env during its build).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED=$NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM ${NODE_IMAGE} AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3200
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# tini reaps zombie processes when the Node process exits.
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

# standalone server + static assets (see next.config `output: 'standalone'`)
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then((r) => process.exit(r.ok || r.status === 307 || r.status === 308 ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
