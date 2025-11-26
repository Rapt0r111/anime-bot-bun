// src/bot/handlers/text-search.handler.ts

import type { BotContext } from '../../types';
import { searchAnime } from '../../services/parser';
import { buildSearchResultsKeyboard } from '../ui/keyboards';
import { buildSearchResultsCaption } from '../ui/messages';
import { logger } from '../../utils/logger';

/**
 * Обработчик текстовых сообщений (поиск аниме)
 */
export async function handleTextSearch(ctx: BotContext) {
  const query = ctx.message?.text?.trim();

  if (!query) return;

  // Игнорируем команды
  if (query.startsWith('/')) return;

  // Минимальная длина запроса
  if (query.length < 2) {
    return ctx.reply('❌ Запрос слишком короткий. Минимум 2 символа.');
  }

  const statusMsg = await ctx.reply('🔍 Ищу аниме...');

  try {
    const results = await searchAnime(query);

    if (results.length === 0) {
      return ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `❌ Ничего не найдено по запросу: "${query}"`
      );
    }

    const keyboard = buildSearchResultsKeyboard(results);
    const caption = buildSearchResultsCaption(query, results.length);

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err) {
    logger.error('[TextSearch] Error:', err);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      '⚠️ Ошибка при поиске. Попробуйте позже.'
    );
  }
}