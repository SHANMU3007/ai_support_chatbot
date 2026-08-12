FROM node:20-alpine AS base

FROM base AS deps
# Install OpenSSL 1.1 compat libs needed by Prisma on Alpine/musl
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
# Install openssl at build stage too (needed for prisma generate on alpine)
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Regenerate Prisma client for linux-musl (Alpine) binary target
RUN npx prisma generate
RUN npm run build

FROM base AS runner
# Install openssl at runtime for Prisma query engine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
