// src/bot/handlers/callbacks/latest-list.handler.ts

import type { BotContext } from '../../../types';
import { getLatestAnime } from '../../../services/parser';
import { buildLatestListKeyboard } from '../../ui/keyboards';
import { buildLatestListCaption } from '../../ui/messages';
import { logger } from '../../../utils/logger';

/**
 * Обработчик для показа списка последних аниме
 */
export async function handleLatestListCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery('🔍 Загрузка...');

  try {
    const items = await getLatestAnime();

    if (items.length === 0) {
      return ctx.reply('❌ Не удалось загрузить список.');
    }

    const keyboard = buildLatestListKeyboard(items);
    const caption = buildLatestListCaption();

    try {
      await ctx.editMessageText(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err) {
      logger.debug('[LatestList] Failed to edit:', err);
      await ctx.deleteMessage();
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    logger.error('[LatestList] Error:', err);
    await ctx.reply('⚠️ Ошибка при загрузке списка. Попробуйте позже.');
  }
}