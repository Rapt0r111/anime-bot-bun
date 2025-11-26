// src/worker/utils/status-updater.ts

import { bot } from '../../core';
import type { StatusUpdater } from '../../types';
import { logger } from '../../utils/logger';
import { WORKER_CONFIG } from '../../config/constants';

/**
 * Создать функцию для обновления статуса с throttling
 */
export function createStatusUpdater(
  chatId: number,
  initialMsgId?: number
): StatusUpdater {
  let statusMsgId: number | undefined = initialMsgId;
  let lastUpdateTime = 0;
  let lastText = '';

  return async (text: string, force: boolean = false): Promise<void> => {
    try {
      const now = Date.now();

      // Избегаем дублирования
      if (!force && text === lastText) return;

      // Throttling (если не форсированное обновление)
      if (
        !force &&
        now - lastUpdateTime < WORKER_CONFIG.STATUS_UPDATE_THROTTLE
      ) {
        return;
      }

      if (!statusMsgId) {
        // Создаем новое сообщение
        const msg = await bot.api.sendMessage(chatId, text, {
          parse_mode: 'HTML',
        });
        statusMsgId = msg.message_id;
      } else {
        // Обновляем существующее
        await bot.api.editMessageText(chatId, statusMsgId, text, {
          parse_mode: 'HTML',
        });
      }

      lastUpdateTime = now;
      lastText = text;
    } catch (err) {
      // Игнорируем ошибки редактирования (например, если текст не изменился)
      logger.debug('[StatusUpdater] Failed:', err);
    }
};
}
/**

Удалить сообщение со статусом
*/
export async function deleteStatusMessage(
chatId: number,
messageId: number
): Promise<void> {
try {
await bot.api.deleteMessage(chatId, messageId);
} catch (err) {
logger.debug('[StatusUpdater] Failed to delete:', err);
}
}

/**

Отправить финальное сообщение об ошибке
*/
export async function sendErrorMessage(
chatId: number,
errorText: string,
messageId?: number,
keyboard?: any
): Promise<void> {
try {
if (messageId) {
await bot.api.editMessageText(chatId, messageId, errorText, {
parse_mode: 'HTML',
reply_markup: keyboard,
});
} else {
await bot.api.sendMessage(chatId, errorText, {
parse_mode: 'HTML',
reply_markup: keyboard,
});
}
} catch (err) {
logger.error('[StatusUpdater] Failed to send error:', err);
}
}