// src/bot/index.ts

import { bot } from '../core';
import { logger } from '../utils/logger';

/**
 * Инициализация и экспорт бота
 * 
 * Все регистрации команд и обработчиков происходят в index.ts
 * Этот файл служит для переэкспорта бота и утилитарных функций
 */

export { bot };

/**
 * Утилита для безопасного ответа на callback
 */
export async function safeAnswerCallback(
  ctx: any,
  text?: string,
  options?: { show_alert?: boolean }
): Promise<void> {
  try {
    await ctx.answerCallbackQuery(text, options);
  } catch (err) {
    logger.debug('[SafeCallback] Failed to answer:', err);
  }
}

/**
 * Утилита для безопасного удаления сообщения
 */
export async function safeDeleteMessage(ctx: any): Promise<void> {
  try {
    await ctx.deleteMessage();
  } catch (err) {
    logger.debug('[SafeDelete] Failed to delete:', err);
  }
}