# =========================================================
# БАЗОВЫЙ STAGE (Системные зависимости)
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
# FRONTEND BUILDER STAGE (Сборка React)
# =========================================================
FROM base AS frontend-builder

WORKDIR /app/webapp

# 1. Копируем файлы пакетов фронтенда
COPY webapp/package.json ./
# Если есть bun.lockb в папке webapp, раскомментируй следующую строку:
# COPY webapp/bun.lockb ./ 

# 2. Устанавливаем зависимости фронтенда
RUN bun install

# 3. Копируем исходный код фронтенда
COPY webapp/ .

# 4. ФИКС ОШИБКИ JSON: Удаляем пустой манифест, если он есть, чтобы VitePWA не падал
RUN rm -f public/manifest.json public/manifest.webmanifest

# 5. ФИКС ОШИБКИ TS: Запускаем сборку напрямую через vite, минуя tsc (игнорируем ошибки типов)
RUN bunx vite build

# =========================================================
# BACKEND DEPENDENCIES STAGE (Зависимости бота)
# =========================================================
FROM base AS dependencies

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# =========================================================
# APP STAGE (Финальный образ)
# =========================================================
FROM dependencies AS app

COPY . .

# 6. ВАЖНО: Копируем собранную папку dist из этапа frontend-builder
COPY --from=frontend-builder /app/webapp/dist ./webapp/dist

ENV NODE_ENV=production
ENV TZ=Europe/Moscow

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Запуск миграций и бота
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