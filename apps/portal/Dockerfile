# Build stage
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# NEXT_PUBLIC_* vars are baked into the client bundle at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/portal/package.json apps/portal/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/portal apps/portal

RUN pnpm --filter @kip/db build

# @kip/db instantiates Sequelize at import time, and next build imports it
# while collecting page data. It never connects during the build — it only
# needs a syntactically valid URL. Builder stage only; runtime uses env_file.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter @kip/portal build

# Runtime stage
FROM node:20-alpine
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
ENV NODE_ENV=production

# Ship the whole workspace rather than Next.js standalone output — the
# serverExternalPackages + webpack-externals workaround in next.config.mjs
# depends on pnpm's node_modules layout, which standalone tracing breaks.
COPY --from=builder /repo ./

EXPOSE 4002
CMD ["pnpm", "--filter", "@kip/portal", "start"]
