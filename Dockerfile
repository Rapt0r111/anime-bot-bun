# =========================================================
# 1. BASE STAGE (Система + Bun)
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
    ca-certificates \
    dos2unix \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# =========================================================
# 2. FRONTEND BUILDER (Сборка React приложения)
# =========================================================
FROM base AS frontend-builder

WORKDIR /app/webapp

COPY webapp/package.json ./
RUN dos2unix package.json

# Устанавливаем зависимости
RUN bun install

COPY webapp/ .

# Чистим файлы от BOM
RUN dos2unix vite.config.ts package.json

# Фикс PWA (манифест)
RUN rm -rf public && mkdir public
RUN echo "{}" > public/manifest.json

# ---> ГЛАВНЫЙ ФИКС CSS И TAILWIND <---
# 1. Принудительно ставим рабочую связку v3
RUN bun add -d tailwindcss@3.4.17 postcss autoprefixer

# 2. Генерируем правильный postcss.config.js (ESM формат для Vite)
RUN echo "export default { plugins: { tailwindcss: {}, autoprefixer: {} } }" > postcss.config.js

# 3. Генерируем правильный tailwind.config.js
RUN echo "/** @type {import('tailwindcss').Config} */ export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [] }" > tailwind.config.js

# 4. Переписываем index.css на стандартный синтаксис v3 (убираем ошибочные @import)
RUN echo "@tailwind base;" > src/index.css && \
    echo "@tailwind components;" >> src/index.css && \
    echo "@tailwind utilities;" >> src/index.css

# Запускаем сборку
RUN bunx vite build

# =========================================================
# 3. BACKEND DEPENDENCIES (Зависимости бота)
# =========================================================
FROM base AS dependencies

WORKDIR /app

COPY package.json bun.lockb* ./
RUN dos2unix package.json
RUN bun install --frozen-lockfile

# =========================================================
# 4. APP STAGE (Основной контейнер бота)
# =========================================================
FROM dependencies AS app

WORKDIR /app

COPY . .

# Копируем собранный фронтенд
COPY --from=frontend-builder /app/webapp/dist ./webapp/dist

ENV NODE_ENV=production
ENV TZ=Europe/Moscow
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["sh", "-c", "bunx drizzle-kit push && bun run src/index.ts"]

# =========================================================
# 5. WORKER STAGE
# =========================================================
FROM app AS worker

CMD ["bun", "run", "src/worker.ts"]