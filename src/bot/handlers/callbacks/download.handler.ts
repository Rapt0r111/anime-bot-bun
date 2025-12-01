// src/bot/handlers/callbacks/download.handler.ts

import type { BotContext } from '../../../types';
import { videoQueue } from '../../../core';
import { episodeRepository } from '../../../db/repositories/episode.repository';
import { cacheService } from '../../../services/cache.service';
import { buildBackButton } from '../../ui/keyboards';
import { logger } from '../../../utils/logger';
import type { Message } from 'grammy/types';

/**
 * Обработчик скачивания эпизода
 */
export async function handleDownloadCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery('⚠️ Некорректные данные');
    return;
  }

  const parts = data.split('|');
  const shortId = parts[1];

  if (!shortId) {
    await ctx.answerCallbackQuery('⚠️ Некорректные данные');
    return;
  }

  // Получаем данные из временного кэша ссылок
  const urlData = cacheService.get(shortId);
  if (!urlData) {
    await ctx.answerCallbackQuery('⚠️ Ссылка устарела, обновите список');
    return;
  }

  const [pageUrl, videoId, epName] = urlData.split('::');
  if (!pageUrl || !videoId || !epName) {
    await ctx.answerCallbackQuery('⚠️ Данные повреждены');
    return;
  }

  // === ИСПРАВЛЕНИЕ: Гарантированное получение ID ===
  const userId = ctx.from?.id;
  // Пытаемся взять ID чата из контекста, либо из сообщения, к которому привязана кнопка
  const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat.id;

  // Если ID не найдены или равны 0 — останавливаем работу
  if (!userId || !chatId) {
    logger.error(`[Download] ❌ Failed to get IDs. User: ${userId}, Chat: ${chatId}`);
    await ctx.answerCallbackQuery('⚠️ Ошибка: не удалось определить ваш ID');
    return;
  }

  const backKey = cacheService.save(pageUrl);
  const backButton = buildBackButton(backKey);

  try {
    // 1. Проверяем, есть ли уже этот эпизод в базе
    const existingEp = await episodeRepository.findBySourceVideoId(videoId);

    // Если файл уже загружен в Telegram — отдаем его сразу
    if (existingEp?.telegramFileId) {
      await ctx.answerCallbackQuery('⚡️ Файл найден в кэше!');

      try {
        await ctx.deleteMessage();
      } catch (err) {
        // Игнорируем ошибку удаления (сообщение могло быть старым)
      }

      await ctx.replyWithVideo(existingEp.telegramFileId, {
        caption:
          `🎬 <b>${existingEp.animeName}</b>\n` +
          `${epName}\n` +
          `⚡️ <i>Мгновенная выдача (Кэш)</i>`,
        parse_mode: 'HTML',
        reply_markup: backButton,
      });

      // Обновляем статистику скачиваний
      await episodeRepository.incrementAccessCount(existingEp.id);
      return;
    }

    // Если файл сейчас в процессе скачивания другим пользователем
    if (existingEp?.isProcessing) {
      await ctx.answerCallbackQuery({
        text: '⏳ Этот эпизод уже скачивается. Подождите немного...',
        show_alert: true,
      });
      return;
    }

    // 2. Если файла нет — начинаем процесс загрузки
    await ctx.answerCallbackQuery('✅ Задача добавлена в очередь');

    const epNum = parseInt(epName.replace(/\D/g, ''), 10) || 0;

    // Создаем запись в БД
    const newEp = await episodeRepository.upsert({
      animeName: 'Загрузка...', // Имя обновится позже воркером
      episodeNumber: epNum,
      sourceVideoId: videoId,
      pageUrl: pageUrl,
      isProcessing: true,
    });

    if (!newEp) {
      throw new Error('Database upsert failed');
    }

    // 3. Отправляем пользователю сообщение со статусом
    let statusMsg: Message.TextMessage | true;

    if (ctx.callbackQuery?.message?.photo) {
      // Если было меню с картинкой — удаляем и шлем новое текстовое
      try {
        await ctx.deleteMessage();
      } catch { }
      statusMsg = await ctx.reply(`✅ <b>Поиск источников...</b>\n${epName}`, {
        parse_mode: 'HTML',
      });
    } else {
      // Если было текстовое меню — редактируем его
      try {
        statusMsg = await ctx.editMessageText(
          `✅ <b>Поиск источников...</b>\n${epName}\n\n<i>Ожидание свободного воркера...</i>`,
          { parse_mode: 'HTML' }
        );
      } catch {
        statusMsg = await ctx.reply(`✅ <b>Поиск источников...</b>\n${epName}`, {
          parse_mode: 'HTML',
        });
      }
    }

    // Безопасно получаем ID сообщения для обновления прогресса
    // editMessageText может вернуть true, если текст не поменялся — тогда ID нам не нужен (undefined)
    const startMsgId = (typeof statusMsg !== 'boolean') ? statusMsg.message_id : undefined;

    // Логируем перед отправкой, чтобы вы видели в консоли правильные ID
    logger.log(`[Download] Sending job -> User: ${userId}, Chat: ${chatId} (Msg: ${startMsgId})`);

    // 4. Отправляем задачу в очередь Redis
    await videoQueue.add('process-video', {
      recordId: newEp.id,
      pageUrl,
      forcedVideoId: videoId,
      epName,
      userId: userId, // Передаем число
      chatId: chatId, // Передаем число
      backKey,
      startMsgId,
    });

    logger.log(`[Download] Job added successfully for episode ID: ${newEp.id}`);

  } catch (err) {
    logger.error('[Download] Handler Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await ctx.reply(`❌ Произошла ошибка при запуске: ${errorMsg}`);
  }
}