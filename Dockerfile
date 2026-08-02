# syntax=docker/dockerfile:1

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `predev` runs the git-based cache sync, which has no place in a build
# container — `next build` is invoked directly to skip it.
RUN yarn next build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# src/data is not copied separately: `outputFileTracingIncludes` in
# next.config.mjs already places it inside .next/standalone. Copying it again
# would duplicate ~115 MB of venue cache into a second layer.

# The Fly release_command runs this against the private-network database before
# any new Machine goes live. `pg` resolves from the standalone node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate-auth.mjs ./scripts/migrate-auth.mjs
COPY --from=builder --chown=nextjs:nodejs /app/src/db/auth-schema.sql ./src/db/auth-schema.sql

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
