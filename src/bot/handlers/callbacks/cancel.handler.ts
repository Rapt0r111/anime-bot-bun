// src/bot/handlers/callbacks/cancel.handler.ts

import type { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';

/**
 * Обработчик кнопки "Отмена/Закрыть"
 */
export async function handleCancelCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery('✅ Закрыто');

  try {
    await ctx.deleteMessage();
  } catch (err) {
    logger.debug('[Cancel] Failed to delete message:', err);
  }
}