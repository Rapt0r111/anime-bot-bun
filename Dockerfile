# =========================================================
# БАЗОВЫЙ STAGE
# =========================================================
FROM oven/bun:1-alpine AS base

RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    chromium \
    nss \
    freetype \
    harfbuzz \
    dbus \
    mesa-gl \
    git \
    openssh-client \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# =========================================================
# DEPENDENCIES STAGE
# =========================================================
FROM base AS dependencies

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# =========================================================
# APP STAGE
# =========================================================
FROM dependencies AS app

COPY . .

ENV NODE_ENV=production
ENV TZ=Europe/Moscow

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["sh", "-c", "bunx drizzle-kit push --config=drizzle.config.ts && bun run src/index.ts"]

# =========================================================
# WORKER STAGE
# =========================================================
FROM dependencies AS worker

COPY . .

ENV NODE_ENV=production
ENV TZ=Europe/Moscow
ENV WORKER_CONCURRENCY=2
ENV WORKER_MAX_JOBS_PER_MINUTE=6

CMD ["bun", "run", "src/worker.ts"]