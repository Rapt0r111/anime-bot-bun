// src/bot/handlers/callbacks/navigation.handler.ts

import type { BotContext } from '../../../types';

/**
 * Обработчик для noop callback (индикатор текущей страницы в пагинации)
 * Просто отвечает на callback без каких-либо действий
 */
export async function handleNoopCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery();
}