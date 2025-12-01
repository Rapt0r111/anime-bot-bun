// src/index.ts

import { bot } from './core';
import { logger } from './utils/logger';

// Middlewares
import { subscriberMiddleware } from './bot/middlewares/subscriber.middleware';
import { errorHandlerMiddleware } from './bot/middlewares/error-handler.middleware';

// Command handlers
import { handleStartCommand } from './bot/handlers/commands/start.handler';
import { handleLatestCommand } from './bot/handlers/commands/latest.handler';
import { handleSearchCommand } from './bot/handlers/commands/search.handler';
import { handleStatsCommand } from './bot/handlers/commands/stats.handler';
import { handleTopCommand } from './bot/handlers/commands/top.handler';
import { handleWebAppCommand } from './bot/handlers/commands/webapp.handler';

// Callback handlers
import { handleLatestListCallback } from './bot/handlers/callbacks/latest-list.handler';
import { handleAnimeSelectionCallback } from './bot/handlers/callbacks/anime-selection.handler';
import { handleDownloadCallback } from './bot/handlers/callbacks/download.handler';
import { handleCancelCallback } from './bot/handlers/callbacks/cancel.handler';

// Text handler
import { handleTextSearch } from './bot/handlers/text-search.handler';

// Services
import { startReleaseWatcher } from './services/release-watcher.service';
import { startCleanupScheduler } from './services/monitoring';
import { registerBotCommands } from './bot/utils/register-commands';

// API Server
import { startApiServer } from './api';
import { rateLimiterMiddleware } from './bot/middlewares/rate-limiter.middleware';

// ==================== SETUP MIDDLEWARES ====================
bot.use(subscriberMiddleware);
bot.use(errorHandlerMiddleware);
bot.use(rateLimiterMiddleware);


// ==================== REGISTER COMMANDS ====================
bot.command('start', handleStartCommand);
bot.command('latest', handleLatestCommand);
bot.command('search', handleSearchCommand);
bot.command('stats', handleStatsCommand);
bot.command('top', handleTopCommand);
bot.command('app', handleWebAppCommand);


// ==================== REGISTER CALLBACKS ====================
bot.callbackQuery(/^latest_list/, handleLatestListCallback);
bot.callbackQuery('start_search', async (ctx) => {
  await ctx.answerCallbackQuery('Просто напишите название аниме в чат!');
});
bot.callbackQuery('noop', async (ctx) => {
  await ctx.answerCallbackQuery();
});
bot.callbackQuery('cancel', handleCancelCallback);

// Dynamic callbacks (select, select_latest, dl)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  // Skip already handled
  if (['latest_list', 'start_search', 'noop', 'cancel'].includes(data)) {
    return;
  }

  const [action] = data.split('|');

  if (action === 'select' || action === 'select_latest') {
    await handleAnimeSelectionCallback(ctx);
  } else if (action === 'dl') {
    await handleDownloadCallback(ctx);
  } else {
    await ctx.answerCallbackQuery('⚠️ Неизвестная команда');
  }
});

// ==================== TEXT MESSAGES ====================
bot.on('message:text', handleTextSearch);

// ==================== START SERVICES ====================
async function bootstrap() {
  try {
    // Регистрация команд в Telegram
    await registerBotCommands();

    // Запуск отслеживания релизов
    startReleaseWatcher();

    // Запуск планировщика очистки
    startCleanupScheduler(24);

    // Запуск API сервера
    startApiServer();

    // Запуск бота
    await bot.start({
      drop_pending_updates: true,
      onStart: (info) => {
        logger.log(`[Bot] ✅ @${info.username} is running!`);
      },
    });
  } catch (err) {
    logger.error('[Bootstrap] Failed to start:', err);
    process.exit(1);
  }
}

// ==================== GRACEFUL SHUTDOWN ====================
async function gracefulShutdown(signal: string): Promise<void> {
  logger.log(`[Bot] Received ${signal}, shutting down gracefully...`);

  try {
    await bot.stop();
    logger.log('[Bot] Bot stopped');

    // Здесь можно добавить очистку других ресурсов

    logger.log('[Bot] Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('[Bot] Shutdown error:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('[FATAL] Unhandled Rejection:', reason);
  
  // Graceful shutdown
  await gracefulShutdown('UNHANDLED_REJECTION');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('[Bot] Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ==================== START ====================
bootstrap();