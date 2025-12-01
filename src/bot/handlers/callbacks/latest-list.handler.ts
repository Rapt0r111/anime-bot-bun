// src/bot/handlers/callbacks/latest-list.handler.ts

import type { BotContext } from '../../../types';
import { getLatestAnime } from '../../../services/parser';
import { buildLatestListKeyboard } from '../../ui/keyboards';
import { buildLatestListCaption } from '../../ui/messages';
import { logger } from '../../../utils/logger';

/**
 * Обработчик для показа списка последних аниме (с пагинацией)
 */
export async function handleLatestListCallback(ctx: BotContext) {
  // 1. Получаем номер страницы из callback_data (формат: latest_list|2)
  const data = ctx.callbackQuery?.data || '';
  const parts = data.split('|');
  // Если страницы нет, считаем что это 1-я
  const page = parseInt(parts[1] || '1', 10);

  await ctx.answerCallbackQuery(`🔍 Загрузка страницы ${page}...`);

  try {
    // 2. Запрашиваем конкретную страницу у парсера
    const items = await getLatestAnime(page);

    if (items.length === 0) {
      // Если вернулся пустой список (например, конец пагинации)
      return ctx.reply('❌ На этой странице нет аниме или произошла ошибка.');
    }

    // 3. Строим клавиатуру, передавая текущую страницу (для кнопок Назад/Вперед)
    const keyboard = buildLatestListKeyboard(items, page);
    const caption = buildLatestListCaption();

    try {
      // Пытаемся отредактировать текущее сообщение
      await ctx.editMessageText(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err) {
      // Если сообщение слишком старое или не может быть изменено — пересоздаем
      logger.debug('[LatestList] Failed to edit message, sending new one:', err);
      try {
        await ctx.deleteMessage();
      } catch { }
      
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    logger.error(`[LatestList] Error loading page ${page}:`, err);
    await ctx.reply('⚠️ Ошибка при загрузке списка. Попробуйте позже.');
  }
}