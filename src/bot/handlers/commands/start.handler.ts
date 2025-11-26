// src/bot/handlers/commands/start.handler.ts

import type { BotContext } from '../../../types';
import { buildMainMenuKeyboard } from '../../ui/keyboards';
import { buildWelcomeMessage } from '../../ui/messages';

/**
 * Обработчик команды /start
 */
export async function handleStartCommand(ctx: BotContext) {
  const keyboard = buildMainMenuKeyboard();
  const message = buildWelcomeMessage();

  return ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}