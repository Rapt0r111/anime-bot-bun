// src/bot/utils/register-commands.ts

import { bot } from '../../core';
import { logger } from '../../utils/logger';

const BOT_COMMANDS = [
  { command: 'start', description: 'Главное меню и быстрые действия' },
  { command: 'latest', description: 'Показать топ-10 новых релизов' },
  { command: 'search', description: 'Как искать аниме по названию' },
  { command: 'stats', description: 'Статистика бота' },
  { command: 'top', description: 'Топ 10 популярных аниме' },
];

/**
 * Зарегистрировать команды бота в Telegram
 */
export async function registerBotCommands(): Promise<void> {
  try {
    await bot.api.setMyCommands(BOT_COMMANDS);
    logger.log(`[Bot] Registered ${BOT_COMMANDS.length} commands`);
  } catch (err) {
    logger.error('[Bot] Failed to register commands:', err);
  }
}