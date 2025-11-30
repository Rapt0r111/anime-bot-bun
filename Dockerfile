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

COPY webapp/package.json webapp/bun.lockb* ./
RUN dos2unix package.json 2>/dev/null || true

# Устанавливаем зависимости
RUN bun install

COPY webapp/ .

# Чистим файлы от BOM
RUN dos2unix vite.config.ts package.json 2>/dev/null || true

# ГЛАВНЫЙ ФИКС: Используем Tailwind CSS v3 вместо v4 alpha
RUN bun remove tailwindcss && \
    bun add -d tailwindcss@^3.4.1 postcss@^8.4.35 autoprefixer@^10.4.18

# Создаем правильные конфиги для Tailwind v3
RUN echo "/** @type {import('tailwindcss').Config} */" > tailwind.config.js && \
    echo "export default {" >> tailwind.config.js && \
    echo "  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']," >> tailwind.config.js && \
    echo "  theme: { extend: {} }," >> tailwind.config.js && \
    echo "  plugins: []" >> tailwind.config.js && \
    echo "}" >> tailwind.config.js

# PostCSS config
RUN echo "export default {" > postcss.config.js && \
    echo "  plugins: {" >> postcss.config.js && \
    echo "    tailwindcss: {}," >> postcss.config.js && \
    echo "    autoprefixer: {}" >> postcss.config.js && \
    echo "  }" >> postcss.config.js && \
    echo "}" >> postcss.config.js

# CSS с правильным синтаксисом
RUN echo "@tailwind base;" > src/index.css && \
    echo "@tailwind components;" >> src/index.css && \
    echo "@tailwind utilities;" >> src/index.css

# Создаем public с манифестом
RUN mkdir -p public && \
    echo '{"name":"AnimeVost","short_name":"Anime","theme_color":"#7c3aed"}' > public/manifest.json

# Собираем фронтенд
RUN bun run build

# =========================================================
# 3. BACKEND DEPENDENCIES
# =========================================================
FROM base AS dependencies

WORKDIR /app

COPY package.json bun.lockb* ./
RUN dos2unix package.json 2>/dev/null || true
RUN bun install --frozen-lockfile

# =========================================================
# 4. APP STAGE (Основной контейнер)
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
  CMD curl -f https://rapt0rs.duckdns.org/health || exit 1

CMD ["sh", "-c", "bunx drizzle-kit push && bun run src/index.ts"]

# =========================================================
# 5. WORKER STAGE
# =========================================================
FROM app AS worker

CMD ["bun", "run", "src/worker.ts"]