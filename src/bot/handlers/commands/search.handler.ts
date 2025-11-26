// src/bot/handlers/commands/search.handler.ts

import type { BotContext } from '../../../types';
import { buildSearchInstructionMessage } from '../../ui/messages';

/**
 * Обработчик команды /search
 */
export async function handleSearchCommand(ctx: BotContext) {
  const message = buildSearchInstructionMessage();
  
  return ctx.reply(message, { parse_mode: 'HTML' });
}