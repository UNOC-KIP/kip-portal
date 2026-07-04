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

RUN pnpm --filter @kip/db build
RUN pnpm --filter @kip/api build

# Runtime stage
FROM node:20-alpine
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
ENV NODE_ENV=production

# Ship the whole workspace: pnpm symlinks in node_modules point at
# ../packages/*, and this image doubles as the migrate/seed job image
# (pnpm db:migrate / db:seed need packages/db source + tsx from the root).
COPY --from=builder /repo ./

EXPOSE 4001
WORKDIR /repo/apps/api
# tsx, not node: @kip/shared's package entry is raw TypeScript
# (packages/shared/src/index.ts), which plain node cannot load.
CMD ["node_modules/.bin/tsx", "dist/index.js"]
