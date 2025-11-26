FROM oven/bun:1-alpine AS base

# Устанавливаем системные зависимости
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
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 1. Сначала копируем файлы зависимостей
COPY package.json bun.lockb* ./

# 2. Устанавливаем зависимости
RUN bun install

# 3. !!! ВАЖНО: Копируем весь исходный код проекта !!!
COPY . .

# =========================================================
# СТАДИЯ 2: APP
# =========================================================
FROM base AS app
# Явно указываем конфиг для Drizzle
CMD ["sh", "-c", "bunx drizzle-kit push --config=drizzle.config.ts && bun run src/index.ts"]

# =========================================================
# СТАДИЯ 3: WORKER
# =========================================================
FROM base AS worker
CMD ["bun", "run", "src/worker.ts"]