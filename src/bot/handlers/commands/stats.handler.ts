// src/bot/handlers/commands/stats.handler.ts

import type { BotContext } from '../../../types';
import { monitoring } from '../../../services/monitoring';
import { buildStatsMessage } from '../../ui/messages';
import { logger } from '../../../utils/logger';

/**
 * Обработчик команды /stats
 */
export async function handleStatsCommand(ctx: BotContext) {
  try {
    const stats = await monitoring.getSystemStats();
    const uptime = monitoring.getUptimeFormatted();

    const message = buildStatsMessage({
      uptime,
      memory: stats.memory,
      database: stats.database,
    });

    return ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error('[Stats Command] Error:', err);
    return ctx.reply('⚠️ Ошибка получения статистики.');
  }
}