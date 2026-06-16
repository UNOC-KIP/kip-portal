# Build stage
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/api apps/api

RUN pnpm --filter @kip/db generate
RUN pnpm --filter @kip/api build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ENV NODE_ENV=production
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "dist/index.js"]
