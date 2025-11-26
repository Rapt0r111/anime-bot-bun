// src/worker/processors/video-processor.ts

import type { Job } from 'bullmq';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { bot } from '../../core';
import { episodeRepository } from '../../db/repositories/episode.repository';
import { extractVideoUrl, ParserError } from '../../services/parser';
import type { VideoJobData } from '../../types';
import { InputFile, InlineKeyboard } from 'grammy';
import { logger } from '../../utils/logger';
import { metrics } from '../utils/metrics';
import { createStatusUpdater, sendErrorMessage } from '../utils/status-updater';
import { downloadVideo } from '../downloaders/video-downloader';
import { PATHS } from '../../config/constants';
import { formatBytes } from '../../utils/formatters';

/**
 * Обработать задачу скачивания видео
 */
export async function processVideoJob(job: Job<VideoJobData>): Promise<void> {
  const {
    recordId,
    pageUrl,
    userId,
    chatId,
    forcedVideoId,
    epName,
    backKey,
    startMsgId,
  } = job.data;

  const targetChatId = chatId || userId;
  logger.log(`[Worker] === JOB ${job.id}: ${epName} ===`);

  const updateStatus = createStatusUpdater(targetChatId, startMsgId);
  let tempFilePath = '';
  const jobStartTime = Date.now();

  try {
    // Step 1: Parse
    await updateStatus(`🔍 <b>Парсинг...</b>\n${epName}`, true);

    const { directUrls, name, quality } = await extractVideoUrl(
      pageUrl,
      forcedVideoId
    );

    if (!directUrls?.length) {
      throw new Error('No video links found');
    }

    logger.log(`[Worker] Found ${directUrls.length} mirror(s), quality: ${quality}`);

    await episodeRepository.update(recordId, {
      animeName: name,
      quality: quality,
    });

    // Step 2: Download
    const fileName = `anime_${recordId}_${Date.now()}.mp4`;
    tempFilePath = path.join(PATHS.SHARED_DIR, fileName);

    await ensureDirectory(PATHS.SHARED_DIR);

    const { fileSize, downloadTime } = await downloadVideo(
      directUrls,
      tempFilePath,
      quality,
      updateStatus
    );

    await setFilePermissions(tempFilePath);

    // Step 3: Upload
    const sizeMB = formatBytes(fileSize);
    logger.log(`[Worker] Uploading... Size: ${sizeMB} MB`);

    await updateStatus(
      `📤 <b>Загрузка в Telegram...</b>\n` +
        `Размер: ${sizeMB} MB\n` +
        `<i>Обработка видео...</i>`,
      true
    );

    const uploadStartTime = Date.now();

    const keyboard = backKey
      ? new InlineKeyboard().text('🔙 Назад', `select|${backKey}|0`)
      : undefined;

    const message = await bot.api.sendVideo(
      targetChatId,
      new InputFile(tempFilePath),
      {
        caption:
          `🎬 <b>${name}</b>\n` +
          `${epName}\n` +
          `✨ Качество: <b>${quality}</b>\n` +
          `💾 Размер: ${sizeMB} MB`,
        parse_mode: 'HTML',
        supports_streaming: true,
        reply_markup: keyboard,
      }
    );

    const uploadTime = Date.now() - uploadStartTime;
    metrics.recordUpload(uploadTime);

    logger.log(`[Worker] ✅ Upload complete in ${(uploadTime / 1000).toFixed(1)}s`);

    // Cleanup status
    if (startMsgId) {
      try {
        await bot.api.deleteMessage(targetChatId, startMsgId);
      } catch {
        // Ignore
      }
    }

    // Update DB
    if (message.video?.file_id) {
      await episodeRepository.update(recordId, {
        isProcessing: false,
        telegramFileId: message.video.file_id,
        fileSize: fileSize,
        hasError: false,
        errorMessage: null,
        lastAccessedAt: new Date(),
        accessCount: 1,
      });
    }

    metrics.recordSuccess();

    const totalTime = Date.now() - jobStartTime;
    logger.log(
      `[Worker] ✅ Job completed in ${(totalTime / 1000).toFixed(1)}s ` +
        `(Download: ${(downloadTime / 1000).toFixed(1)}s, Upload: ${(uploadTime / 1000).toFixed(1)}s)`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    const isParserError = err instanceof ParserError;

    logger.error(`[Worker] ❌ FATAL:`, errorMsg);

    await episodeRepository.update(recordId, {
      isProcessing: false,
      hasError: true,
      errorMessage: errorMsg,
    });

    const keyboard = backKey
      ? new InlineKeyboard().text('🔙 Назад', `select|${backKey}|0`)
      : undefined;

    // Пользовательские сообщения об ошибках
    let userMsg = `❌ <b>Ошибка:</b>\n`;

    if (isParserError) {
      const pe = err as ParserError;
      if (pe.code === 'CAPTCHA_DETECTED') {
        userMsg += 'Сайт требует капчу. Попробуйте позже.';
      } else if (pe.code === 'NO_HIGH_QUALITY_URLS') {
        userMsg += 'Видео высокого качества (1080p/720p) не найдено.';
      } else {
        userMsg += pe.message;
      }
    } else if (errorMsg.includes('too large')) {
      userMsg += 'Файл слишком большой (>2GB). Telegram не поддерживает.';
    } else if (errorMsg.includes('timeout')) {
      userMsg += 'Превышено время ожидания. Попробуйте позже.';
    } else {
      userMsg += errorMsg;
    }

    await sendErrorMessage(targetChatId, userMsg, startMsgId, keyboard);

    metrics.recordFailure();

    // Решение о повторной попытке
    if (isParserError && !(err as ParserError).retryable) {
      throw new Error('Non-retryable parser error');
    }
  } finally {
    await cleanupFile(tempFilePath);
  }
}

// ==================== UTILITIES ====================

async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function cleanupFile(filePath: string): Promise<void> {
  try {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      logger.log(`[Cleanup] Removed: ${filePath}`);
    }
  } catch (err) {
    logger.debug('[Cleanup] Failed:', err);
  }
}

async function setFilePermissions(filePath: string): Promise<void> {
  try {
    await fs.chmod(filePath, 0o666);
  } catch (err) {
    logger.warn('[Permissions] chmod failed:', err);
  }
}