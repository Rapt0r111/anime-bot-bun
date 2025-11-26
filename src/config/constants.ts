// src/config/constants.ts

/**
 * Определяем режим работы на основе окружения
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Конфигурация кэша URL
 */
export const CACHE_CONFIG = {
  URL_TTL: 3600 * 1000, // 1 час
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 минут
  MAX_ENTRIES: 10000, // Максимум записей в кэше
} as const;

/**
 * Настройки пагинации
 */
export const PAGINATION = {
  ITEMS_PER_PAGE: 20,
  BUTTONS_PER_ROW: 5,
  MAX_PAGES: 50, // Защита от слишком большой пагинации
} as const;

/**
 * Лимиты текста (Telegram)
 */
export const TEXT_LIMITS = {
  MAX_BUTTON_TEXT: 8,
  MAX_TITLE: 50,
  MAX_SEARCH_TITLE: 40,
  TELEGRAM_CAPTION: 1024,
  MAX_RELEASE_DESCRIPTION: 320,
  MAX_LOG_SNIPPET: 220,
  MAX_MESSAGE_LENGTH: 4096,
} as const;

/**
 * Настройки отслеживания релизов
 */
export const RELEASE_WATCHER = {
  POLL_INTERVAL_MS: parseInt(
    process.env.RELEASE_POLL_INTERVAL_MS || '180000',
    10
  ), // 3 минуты по умолчанию
  TOP_ITEMS_COUNT: 10,
  MAX_NOTIFICATIONS_PER_BATCH: 50, // Лимит уведомлений за раз
  NOTIFICATION_DELAY_MS: 1000, // Задержка между уведомлениями
} as const;

/**
 * КРИТИЧЕСКАЯ КОНФИГУРАЦИЯ: Настройки скачивания
 * Оптимизированы для стабильности и скорости
 */
export const DOWNLOAD_CONFIG = {
  MAX_ATTEMPTS: 5, // Максимум попыток скачивания
  TIMEOUT: 180_000, // 3 минуты (можно увеличить до 300_000 для медленных соединений)
  STALL_CHECK_INTERVAL: 15_000, // 15 секунд без прогресса = stall
  MIN_FILE_SIZE: 1024 * 1024, // 1 MB минимум
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB лимит Telegram
  
  // Прогрессивная задержка между попытками (exponential backoff + jitter)
  RETRY_DELAYS: [3000, 5000, 10000, 20000], // мс
  
  // Настройки для разных типов соединений
  RETRY_STRATEGIES: {
    fast: [1000, 2000, 4000], // Для быстрых соединений
    normal: [3000, 5000, 10000, 20000], // По умолчанию
    slow: [5000, 10000, 20000, 40000], // Для медленных соединений
  },
  
  // Buffer размеры
  CHUNK_SIZE: 64 * 1024, // 64KB chunks
  HIGH_WATER_MARK: 16 * 1024 * 1024, // 16MB buffer
} as const;

/**
 * Конфигурация Worker (BullMQ)
 */
export const WORKER_CONFIG = {
  CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  
  RATE_LIMIT: {
    max: parseInt(process.env.WORKER_MAX_JOBS_PER_MINUTE || '8', 10),
    duration: 60000, // 1 минута
  },
  
  STATUS_UPDATE_THROTTLE: 3000, // Обновление статуса раз в 3 секунды
  METRICS_LOG_INTERVAL: 10 * 60 * 1000, // Логирование метрик раз в 10 минут
  
  // Настройки для разных режимов
  MODES: {
    development: {
      concurrency: 1,
      rateLimit: { max: 4, duration: 60000 },
    },
    production: {
      concurrency: 2,
      rateLimit: { max: 8, duration: 60000 },
    },
    high_load: {
      concurrency: 4,
      rateLimit: { max: 16, duration: 60000 },
    },
  },
  
  // Backoff стратегия
  BACKOFF: {
    type: 'exponential' as const,
    delay: 1000,
    maxDelay: 60000,
  },
  
  // Retry логика
  MAX_JOB_ATTEMPTS: 3,
  JOB_TIMEOUT: 600000, // 10 минут на обработку одной задачи
} as const;

/**
 * Пути к файлам
 */
export const PATHS = {
  SHARED_DIR: '/var/lib/telegram-bot-api/shared',
  TEMP_DIR: './temp',
  LOGS_DIR: './logs',
  CACHE_DIR: './cache',
} as const;

/**
 * HTTP заголовки для запросов
 */
export const HEADERS = {
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  REFERER: 'https://animevost.org/',
  ORIGIN: 'https://animevost.org',
  ACCEPT: '*/*',
  ACCEPT_LANGUAGE: 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  CONNECTION: 'keep-alive',
  ACCEPT_ENCODING: 'identity', // Отключаем сжатие для стабильности
} as const;

/**
 * Настройки парсера
 */
export const PARSER_CONFIG = {
  MIRROR_DOMAIN: 'animevost.org',
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 4000],
  REQUEST_TIMEOUT: 15000,
  
  // Кэш настройки
  CACHE_TTL: 10 * 60 * 1000, // 10 минут
  MAX_CACHE_SIZE: 1000, // Максимум записей
  
  // Приоритет качества (в порядке приоритета)
  QUALITY_PRIORITY: ['1080P', 'FHD', '720P', 'HD', '480P', 'SD'],
  
  // Приоритет зеркал (score для сортировки)
  MIRROR_PRIORITY: {
    'trn.su': 3,
    'tigerlips': 2,
    'aniqit': 1,
  },
} as const;

/**
 * Лимиты для защиты от злоупотреблений
 */
export const RATE_LIMITS = {
  // Лимиты для пользователей
  USER_REQUESTS_PER_MINUTE: 20,
  USER_DOWNLOADS_PER_HOUR: 100,
  USER_SEARCHES_PER_MINUTE: 10,
  
  // Лимиты для системы
  GLOBAL_REQUESTS_PER_SECOND: 50,
  MAX_CONCURRENT_DOWNLOADS: 10,
  
  // Таймауты
  COOLDOWN_AFTER_ERROR: 5000, // 5 секунд после ошибки
  COOLDOWN_AFTER_SUCCESS: 500, // 0.5 секунды после успеха
} as const;

/**
 * Настройки мониторинга
 */
export const MONITORING_CONFIG = {
  // Health checks
  HEALTH_CHECK_INTERVAL: 30000, // 30 секунд
  HEALTH_CHECK_TIMEOUT: 5000, // 5 секунд timeout
  
  // Metrics
  METRICS_RETENTION_HOURS: 24,
  METRICS_SAMPLE_SIZE: 100, // Храним последние 100 значений
  
  // Alerts
  MEMORY_THRESHOLD_WARNING: 70, // % использования памяти
  MEMORY_THRESHOLD_CRITICAL: 90,
  DISK_THRESHOLD_WARNING: 80,
  DISK_THRESHOLD_CRITICAL: 95,
  
  // Cleanup
  CLEANUP_INTERVAL_HOURS: 24,
  CLEANUP_AGE_DAYS: 30,
  
  // Stats logging
  STATS_LOG_INTERVAL: 10 * 60 * 1000, // 10 минут
} as const;

/**
 * База данных - настройки
 */
export const DATABASE_CONFIG = {
  // Connection pool
  POOL_MIN: 2,
  POOL_MAX: 10,
  
  // Timeouts
  CONNECT_TIMEOUT: 10000,
  IDLE_TIMEOUT: 30000,
  
  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * Получить активную конфигурацию Worker в зависимости от режима
 */
export function getWorkerConfig() {
  const mode = IS_PRODUCTION ? 'production' : 'development';
  const config = WORKER_CONFIG.MODES[mode];
  
  return {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || String(config.concurrency), 10),
    rateLimit: {
      max: parseInt(
        process.env.WORKER_MAX_JOBS_PER_MINUTE || String(config.rateLimit.max),
        10
      ),
      duration: config.rateLimit.duration,
    },
  };
}


/**
 * Проверить лимиты памяти
 */
export function checkMemoryLimits(): {
  status: 'ok' | 'warning' | 'critical';
  percentage: number;
} {
  const memUsage = process.memoryUsage();
  const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  
  if (percentage >= MONITORING_CONFIG.MEMORY_THRESHOLD_CRITICAL) {
    status = 'critical';
  } else if (percentage >= MONITORING_CONFIG.MEMORY_THRESHOLD_WARNING) {
    status = 'warning';
  }
  
  return { status, percentage };
}

/**
 * Экспорт всех конфигов для удобного импорта
 */
export const CONFIG = {
  CACHE: CACHE_CONFIG,
  PAGINATION,
  TEXT_LIMITS,
  RELEASE_WATCHER,
  DOWNLOAD: DOWNLOAD_CONFIG,
  WORKER: WORKER_CONFIG,
  PATHS,
  HEADERS,
  PARSER: PARSER_CONFIG,
  RATE_LIMITS,
  MONITORING: MONITORING_CONFIG,
  DATABASE: DATABASE_CONFIG,
} as const;

/**
 * Валидация конфигурации при запуске
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  // Проверка обязательных env переменных
  if (!process.env.BOT_TOKEN) {
    errors.push('BOT_TOKEN is required');
  }
  
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) {
    errors.push('TELEGRAM_API_ID and TELEGRAM_API_HASH are required');
  }
  
  // Проверка числовых значений
  if (WORKER_CONFIG.CONCURRENCY < 1 || WORKER_CONFIG.CONCURRENCY > 10) {
    errors.push('WORKER_CONCURRENCY must be between 1 and 10');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

// Автоматическая валидация при импорте (только в production)
if (IS_PRODUCTION) {
  validateConfig();
}