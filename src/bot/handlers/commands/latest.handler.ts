// src/bot/handlers/commands/latest.handler.ts

import type { BotContext } from '../../../types';
import { getLatestAnime } from '../../../services/parser';
import { buildLatestListKeyboard } from '../../ui/keyboards';
import { buildLatestListCaption } from '../../ui/messages';
import { logger } from '../../../utils/logger';

/**
 * Обработчик команды /latest
 */
export async function handleLatestCommand(ctx: BotContext) {
  const statusMsg = await ctx.reply('🔍 Загрузка последних релизов...');

  try {
    // Запрашиваем первую страницу
    const page = 1;
    const items = await getLatestAnime(page);

    if (items.length === 0) {
      return ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        '❌ Не удалось загрузить список.'
      );
    }

    // Передаем items и номер страницы (1), чтобы клавиатура могла добавить кнопку "Вперед"
    // (Вам нужно будет обновить buildLatestListKeyboard, чтобы она принимала второй аргумент)
    const keyboard = buildLatestListKeyboard(items, page);
    const caption = buildLatestListCaption();

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err) {
    logger.error('[Latest Command] Error:', err);
    try {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        '⚠️ Ошибка при загрузке списка. Попробуйте позже.'
      );
    } catch {
      // Игнорируем, если сообщение уже удалено
    }
  }
}