// src/bot/handlers/callbacks/download.handler.ts

import type { BotContext } from '../../../types';
import { videoQueue } from '../../../core';
import { episodeRepository } from '../../../db/repositories/episode.repository';
import { cacheService } from '../../../services/cache.service';
import { buildBackButton } from '../../ui/keyboards';
import { logger } from '../../../utils/logger';

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

  const urlData = cacheService.get(shortId);
  if (!urlData) {
    await ctx.answerCallbackQuery('⚠️ Ссылка устарела');
    return;
  }

  const [pageUrl, videoId, epName] = urlData.split('::');
  if (!pageUrl || !videoId || !epName) {
    await ctx.answerCallbackQuery('⚠️ Некорректные данные');
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery('⚠️ Не удалось определить пользователя');
    return;
  }

  const backKey = cacheService.save(pageUrl);
  const backButton = buildBackButton(backKey);

  try {
    // Проверяем кэш
    const existingEp = await episodeRepository.findBySourceVideoId(videoId);

    if (existingEp?.telegramFileId) {
      await ctx.answerCallbackQuery('⚡️ Из кэша!');

      try {
        await ctx.deleteMessage();
      } catch (err) {
        logger.debug('[Download] Failed to delete message:', err);
      }

      await ctx.replyWithVideo(existingEp.telegramFileId, {
        caption:
          `🎬 <b>${existingEp.animeName}</b>\n` +
          `${epName}\n` +
          `⚡️ <i>Из кэша</i>`,
        parse_mode: 'HTML',
        reply_markup: backButton,
      });

      // Обновляем счетчик
      await episodeRepository.incrementAccessCount(existingEp.id);
      return;
    }

    if (existingEp?.isProcessing) {
      // Исправлено: используем правильный синтаксис для show_alert
      return ctx.answerCallbackQuery({
        text: '⏳ Уже скачивается...',
        show_alert: true,
      });
    }

    await ctx.answerCallbackQuery('✅ Запуск скачивания...');

    const epNum = parseInt(epName.replace(/\D/g, ''), 10) || 0;

    const newEp = await episodeRepository.upsert({
      animeName: 'Загрузка...',
      episodeNumber: epNum,
      sourceVideoId: videoId,
      pageUrl: pageUrl,
      isProcessing: true,
    });

    if (!newEp) {
      throw new Error('Не удалось создать задачу на скачивание');
    }

    // Отправляем статус
    let statusMsg;
    if (ctx.callbackQuery?.message?.photo) {
      try {
        await ctx.deleteMessage();
      } catch (err) {
        logger.debug('[Download] Failed to delete message:', err);
      }
      statusMsg = await ctx.reply(`✅ <b>Задача добавлена!</b>\n${epName}`, {
        parse_mode: 'HTML',
      });
    } else {
      try {
        statusMsg = await ctx.editMessageText(
          `✅ <b>Задача добавлена!</b>\n${epName}\n\n<i>Ожидание...</i>`,
          { parse_mode: 'HTML' }
        );
      } catch {
        statusMsg = await ctx.reply(`✅ <b>Задача добавлена!</b>\n${epName}`, {
          parse_mode: 'HTML',
        });
      }
    }

    // Добавляем в очередь
    await videoQueue.add('process-video', {
      recordId: newEp.id,
      pageUrl,
      forcedVideoId: videoId,
      epName,
      userId,
      chatId: ctx.chat?.id,
      backKey,
      startMsgId: statusMsg?.message_id,
    });

    logger.log(`[Download] Added job for episode ${epName} (ID: ${newEp.id})`);
  } catch (err) {
    logger.error('[Download] Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
    await ctx.reply(`❌ Ошибка: ${errorMsg}`);
  }
}