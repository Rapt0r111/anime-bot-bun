// src/bot/handlers/commands/top.handler.ts

import type { BotContext } from '../../../types';
import { episodeRepository } from '../../../db/repositories/episode.repository';
import { buildTopAnimeMessage } from '../../ui/messages';
import { logger } from '../../../utils/logger';

/**
 * Обработчик команды /top
 */
export async function handleTopCommand(ctx: BotContext) {
  try {
    const top = await episodeRepository.getTopAnime(10);
    const message = buildTopAnimeMessage(top);

    return ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error('[Top Command] Error:', err);
    return ctx.reply('⚠️ Ошибка получения топа.');
  }
}