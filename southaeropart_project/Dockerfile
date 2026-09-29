# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# South Aero Production Multi-Stage Hardened Dockerfile
#
# Targets:
#   - runner-storefront: Production container for Storefront (Port 3000)
#   - runner-admin:      Production container for Admin Dashboard (Port 3001)
#
# Build commands:
#   docker build --target runner-storefront -t southaero-storefront .
#   docker build --target runner-admin -t southaero-admin .
# ──────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Base Alpine with Node.js 22 LTS ───
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app

# ─── Stage 2: Prune & Extract Dependencies ───
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/admin/package.json ./apps/admin/
COPY packages/db/package.json ./packages/db/
COPY packages/lib/package.json ./packages/lib/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: Builder ───
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build all packages and applications (Turborepo)
RUN pnpm build

# ─── Stage 4: Storefront Production Runner ───
FROM node:22-alpine AS runner-storefront
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Hardening: Run as non-root user (UID:GID 1001:1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build and minimal assets
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./apps/storefront/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/storefront/server.js"]

# ─── Stage 5: Admin Production Runner ───
FROM node:22-alpine AS runner-admin
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Hardening: Run as non-root user (UID:GID 1001:1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build and minimal assets
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "apps/admin/server.js"]
