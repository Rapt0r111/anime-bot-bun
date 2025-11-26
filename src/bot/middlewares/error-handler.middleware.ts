// src/bot/middlewares/error-handler.middleware.ts

import type { BotContext } from '../../types';
import { logger } from '../../utils/logger';
import { GrammyError, HttpError } from 'grammy';

/**
 * Middleware для обработки ошибок
 */
export async function errorHandlerMiddleware(ctx: BotContext, next: () => Promise<void>) {
  try {
    await next();
  } catch (err) {
    logger.error('[ErrorHandler] Error occurred:', err);

    // Обработка специфичных ошибок Grammy
    if (err instanceof GrammyError) {
      logger.error('[ErrorHandler] Grammy error:', {
        error_code: err.error_code,
        description: err.description,
      });

      // 403 - бот заблокирован пользователем
      if (err.error_code === 403) {
        logger.warn(`[ErrorHandler] Bot blocked by user: ${ctx.chat?.id}`);
        return;
      }

      // 400 - неверный запрос
      if (err.error_code === 400) {
        try {
          await ctx.reply('⚠️ Произошла ошибка. Попробуйте еще раз.');
        } catch {
          // Игнорируем, если не можем отправить сообщение
        }
        return;
      }
    }

    // Обработка HTTP ошибок
    if (err instanceof HttpError) {
      logger.error('[ErrorHandler] HTTP error:', {
        error: err.error,
      });
      return;
    }

    // Общая обработка
    try {
      await ctx.reply('❌ Произошла непредвиденная ошибка. Попробуйте позже.');
    } catch {
      // Игнорируем, если не можем отправить сообщение
    }
  }
}