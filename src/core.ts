import { Bot } from 'grammy';
import { Queue } from 'bullmq';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

// БД
const sql = postgres(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Очередь (Redis)
export const videoQueue = new Queue('anime-processing', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

// Бот с настройкой Local API
// Важно: bot_api_url должен вести на контейнер telegram-api внутри docker сети
const apiRoot = process.env.TELEGRAM_API_ROOT || 'http://telegram-api:8081';

export const bot = new Bot(process.env.BOT_TOKEN!, {
  client: {
    apiRoot: apiRoot,
    // Разрешаем отправку файлов через локальный путь
    canUseWebhookReply: (method) => false, 
  },
});