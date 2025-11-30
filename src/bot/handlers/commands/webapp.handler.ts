// src/bot/handlers/commands/webapp.handler.ts
import type { BotContext } from '../../../types';

export async function handleWebAppCommand(ctx: BotContext) {
  const webAppUrl = process.env.WEBAPP_URL || 'https://rapt0rs.duckdns.org';
  
  await ctx.reply('🎬 Откройте наше веб-приложение:', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🚀 Открыть AnimeVost App',
          web_app: { url: webAppUrl }
        }
      ]]
    }
  });
}