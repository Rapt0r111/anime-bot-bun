// src/worker/downloaders/video-downloader.ts

import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import type { DownloadResult, StatusUpdater } from '../../types';
import { logger } from '../../utils/logger';
import { metrics } from '../utils/metrics';
import { formatBytes, formatSpeed, drawProgressBar } from '../../utils/formatters';
import { DOWNLOAD_CONFIG, HEADERS } from '../../config/constants';

interface DownloadOptions {
  maxRetries?: number;
  timeout?: number;
  stallCheckInterval?: number;
  minFileSize?: number;
  maxFileSize?: number;
}

/**
 * КРИТИЧЕСКОЕ УЛУЧШЕНИЕ: Скачивание видео с умным переключением зеркал
 */
export async function downloadVideo(
  urls: string[],
  tempFilePath: string,
  quality: string,
  updateStatus: StatusUpdater,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const {
    maxRetries = DOWNLOAD_CONFIG.MAX_ATTEMPTS,
    timeout = DOWNLOAD_CONFIG.TIMEOUT,
    stallCheckInterval = DOWNLOAD_CONFIG.STALL_CHECK_INTERVAL,
    minFileSize = DOWNLOAD_CONFIG.MIN_FILE_SIZE,
    maxFileSize = DOWNLOAD_CONFIG.MAX_FILE_SIZE
  } = options;

  const startTime = Date.now();
  const failedMirrors = new Set<string>();

  // Умная стратегия: пробуем каждое зеркало по несколько раз
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Выбираем зеркало, которое еще не отказало
    const availableMirrors = urls.filter(url => !failedMirrors.has(url));
    
    if (availableMirrors.length === 0) {
      // Все зеркала отказали, сбрасываем список
      failedMirrors.clear();
    }

    const urlIndex = (attempt - 1) % (availableMirrors.length || urls.length);
    const url = availableMirrors[urlIndex] || urls[urlIndex];

    if (!url) {
      throw new Error('No available mirrors');
    }

    // Очистка файла перед новой попыткой
    await cleanupFile(tempFilePath);
    
    const mirrorName = extractMirrorName(url);
    logger.log(
      `[Download] Attempt ${attempt}/${maxRetries}: ${mirrorName} (${urlIndex + 1}/${urls.length})`
    );

    try {
      await updateStatus(
        `📥 <b>Скачивание...</b>\n` +
          `Попытка ${attempt}/${maxRetries}\n` +
          `Качество: <b>${quality}</b>\n` +
          `Зеркало: ${mirrorName}`,
        true
      );

      const result = await attemptDownload(
        url,
        tempFilePath,
        quality,
        attempt,
        maxRetries,
        mirrorName,
        updateStatus,
        { timeout, stallCheckInterval }
      );

      // Проверка размера
      const stats = await fs.stat(tempFilePath);
      if (stats.size < minFileSize) {
        throw new Error(`File too small: ${formatBytes(stats.size)} MB`);
      }

      if (stats.size > maxFileSize) {
        throw new Error(`File too large: ${formatBytes(stats.size)} MB`);
      }

      const downloadTime = Date.now() - startTime;
      metrics.recordDownload(downloadTime, stats.size);

      logger.log(
        `[Download] ✅ Success! Mirror: ${mirrorName}, ` +
        `Size: ${formatBytes(stats.size)} MB, ` +
        `Time: ${(downloadTime / 1000).toFixed(1)}s`
      );

      return {
        success: true,
        filePath: tempFilePath,
        fileSize: stats.size,
        downloadTime,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`[Download] ❌ Attempt ${attempt} failed on ${mirrorName}: ${errorMsg}`);

      // Помечаем зеркало как неудачное
      failedMirrors.add(url);
      metrics.recordRetry();

      // Если это не последняя попытка, ждем перед retry
      if (attempt < maxRetries) {
        const delay = calculateRetryDelay(attempt);
        logger.log(`[Download] Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Download failed after ${maxRetries} attempts across ${urls.length} mirror(s). ` +
    `All mirrors exhausted.`
  );
}

/**
 * Одна попытка скачивания с прогрессом
 */
async function attemptDownload(
  url: string,
  tempFilePath: string,
  quality: string,
  attempt: number,
  maxAttempts: number,
  mirrorName: string,
  updateStatus: StatusUpdater,
  options: { timeout: number; stallCheckInterval: number }
): Promise<void> {
  const { timeout, stallCheckInterval } = options;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn('[Download] Timeout triggered');
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': HEADERS.USER_AGENT,
        'Referer': HEADERS.REFERER,
        'Origin': HEADERS.ORIGIN,
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'identity',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Проверка content-type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('html') || contentType.includes('text')) {
      throw new Error('Invalid content type (error page detected)');
    }

    const totalBytes = Number(response.headers.get('content-length')) || 0;
    
    if (totalBytes === 0) {
      logger.warn('[Download] Warning: Content-Length is 0 or missing');
    }

    let downloadedBytes = 0;
    let lastCheckedBytes = 0;
    let lastProgressUpdate = Date.now();
    const speedSamples: number[] = [];

    // Stall detection: останавливаем если нет прогресса
    const stallInterval = setInterval(() => {
      if (downloadedBytes === lastCheckedBytes && downloadedBytes > 0) {
        logger.warn('[Download] Stall detected - no progress');
        controller.abort();
      }
      lastCheckedBytes = downloadedBytes;
    }, stallCheckInterval);

    const fileStream = createWriteStream(tempFilePath);
    const readable = Readable.fromWeb(response.body as any);

    // Progress tracking с умным throttling
    readable.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;

      const now = Date.now();
      if (totalBytes && now - lastProgressUpdate > 2000) {
        const percent = Math.round((downloadedBytes / totalBytes) * 100);
        const mb = formatBytes(downloadedBytes);
        const totalMb = formatBytes(totalBytes);
        const speed = downloadedBytes / ((now - startTime) / 1000);

        // Сглаживание скорости (rolling average)
        speedSamples.push(speed);
        if (speedSamples.length > 5) speedSamples.shift();
        const avgSpeed =
          speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;

        const eta =
          totalBytes > 0 && avgSpeed > 0
            ? Math.round((totalBytes - downloadedBytes) / avgSpeed)
            : 0;

        updateStatus(
          `📥 <b>Скачивание...</b>\n` +
            `Зеркало: ${mirrorName} (${attempt}/${maxAttempts})\n` +
            `Качество: <b>${quality}</b>\n` +
            `<code>[${drawProgressBar(percent)}] ${percent}%</code>\n` +
            `📦 ${mb} / ${totalMb} MB\n` +
            `⚡ ${formatSpeed(avgSpeed)}` +
            (eta > 0 ? ` • ETA: ${formatEta(eta)}` : '')
        ).catch(() => {});

        lastProgressUpdate = now;
      }
    });

    await finished(readable.pipe(fileStream));
    clearInterval(stallInterval);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Извлечь имя зеркала из URL
 */
function extractMirrorName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Вычислить задержку для retry (экспоненциальный backoff с jitter)
 */
function calculateRetryDelay(attempt: number): number {
  const baseDelay = DOWNLOAD_CONFIG.RETRY_DELAYS[attempt - 1] || 20000;
  const jitter = Math.random() * 1000; // Добавляем случайность
  return baseDelay + jitter;
}

/**
 * Форматировать ETA
 */
function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

/**
 * Очистка файла
 */
async function cleanupFile(filePath: string): Promise<void> {
  try {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      logger.debug(`[Cleanup] Removed: ${filePath}`);
    }
  } catch (err) {
    logger.debug('[Cleanup] Failed:', err);
  }
}