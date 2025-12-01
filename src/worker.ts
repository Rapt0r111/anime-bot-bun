// src/worker.ts - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { Worker, Job } from 'bullmq';
import { bot, db } from './core';
import { episodes } from './db/schema';
import { extractVideoUrl, ParserError } from './services/parser';
import { eq } from 'drizzle-orm';
import { InputFile, InlineKeyboard } from 'grammy';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { logger } from './utils/logger';
import { DOWNLOAD_CONFIG, WORKER_CONFIG, PATHS } from './config/constants';

// ==================== TYPES ====================
interface JobData {
    recordId: number;
    pageUrl: string;
    userId: number;
    chatId?: number;
    forcedVideoId?: string;
    epName: string;
    backKey?: string;
    startMsgId?: number;
}

interface DownloadProgress {
    totalBytes: number;
    downloadedBytes: number;
    startTime: number;
    lastUpdate: number;
}

// ==================== METRICS ====================
class WorkerMetrics {
    private stats = {
        totalJobs: 0,
        successJobs: 0,
        failedJobs: 0,
        totalDownloadTime: 0,
        totalUploadTime: 0,
        totalBytes: 0,
        retries: 0
    };

    recordDownload(timeMs: number, bytes: number): void {
        this.stats.totalDownloadTime += timeMs;
        this.stats.totalBytes += bytes;
    }

    recordUpload(timeMs: number): void {
        this.stats.totalUploadTime += timeMs;
    }

    recordSuccess(): void {
        this.stats.totalJobs++;
        this.stats.successJobs++;
    }

    recordFailure(): void {
        this.stats.totalJobs++;
        this.stats.failedJobs++;
    }

    recordRetry(): void {
        this.stats.retries++;
    }

    getStats() {
        const avgDownloadTime = this.stats.successJobs > 0
            ? Math.round(this.stats.totalDownloadTime / this.stats.successJobs)
            : 0;

        const avgUploadTime = this.stats.successJobs > 0
            ? Math.round(this.stats.totalUploadTime / this.stats.successJobs)
            : 0;

        return {
            ...this.stats,
            avgDownloadTime,
            avgUploadTime,
            totalGB: (this.stats.totalBytes / 1024 / 1024 / 1024).toFixed(2),
            successRate: this.stats.totalJobs > 0
                ? Math.round((this.stats.successJobs / this.stats.totalJobs) * 100)
                : 0
        };
    }
}

const metrics = new WorkerMetrics();

// ==================== UTILITIES ====================
function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
}

function formatSpeed(bytesPerSecond: number): string {
    const mbps = bytesPerSecond / 1024 / 1024;
    return mbps >= 1 ? `${mbps.toFixed(1)} MB/s` : `${(mbps * 1024).toFixed(0)} KB/s`;
}

function drawProgressBar(percent: number, width: number = 10): string {
    const filled = Math.round(width * (percent / 100));
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// ==================== STATUS UPDATER ====================
function createStatusUpdater(chatId: number, initialMsgId?: number) {
    let statusMsgId: number | undefined = initialMsgId;
    let lastUpdateTime = 0;
    let lastText = '';

    return async (text: string, force: boolean = false): Promise<void> => {
        try {
            const now = Date.now();

            if (!force && text === lastText) return;
            if (!force && (now - lastUpdateTime) < WORKER_CONFIG.STATUS_UPDATE_THROTTLE) return;

            if (!statusMsgId) {
                const msg = await bot.api.sendMessage(chatId, text, {
                    parse_mode: 'HTML'
                });
                statusMsgId = msg.message_id;
            } else {
                await bot.api.editMessageText(chatId, statusMsgId, text, {
                    parse_mode: 'HTML'
                });
            }

            lastUpdateTime = now;
            lastText = text;
        } catch (err) {
            logger.debug('[StatusUpdater] Failed:', err);
        }
    };
}

// ==================== FILE OPERATIONS ====================
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

// ==================== DOWNLOAD WITH RETRY ====================
async function downloadVideo(
    urls: string[],
    tempFilePath: string,
    quality: string,
    updateStatus: ReturnType<typeof createStatusUpdater>
): Promise<{ fileSize: number; downloadTime: number }> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= DOWNLOAD_CONFIG.MAX_ATTEMPTS; attempt++) {
        const urlIndex = (attempt - 1) % urls.length;
        const url = urls[urlIndex];

        if (!url) throw new Error('URL is undefined');

        await cleanupFile(tempFilePath);
        logger.log(`[Download] Attempt ${attempt}/${DOWNLOAD_CONFIG.MAX_ATTEMPTS}: Mirror ${urlIndex + 1}`);

        try {
            await updateStatus(
                `📥 <b>Скачивание...</b>\n` +
                `Попытка ${attempt}/${DOWNLOAD_CONFIG.MAX_ATTEMPTS}\n` +
                `Качество: <b>${quality}</b>\n` +
                `Зеркало: ${urlIndex + 1}/${urls.length}`,
                true
            );

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                logger.warn('[Download] Timeout triggered');
                controller.abort();
            }, DOWNLOAD_CONFIG.TIMEOUT);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://animevost.org/',
                    'Origin': 'https://animevost.org',
                    'Accept': '*/*',
                    'Connection': 'keep-alive',
                    'Accept-Encoding': 'identity'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('html') || contentType.includes('text')) {
                throw new Error('Invalid content type (error page)');
            }

            const totalBytes = Number(response.headers.get('content-length')) || 0;

            if (totalBytes > DOWNLOAD_CONFIG.MAX_FILE_SIZE) {
                throw new Error(`File too large: ${formatBytes(totalBytes)} MB`);
            }

            const progress: DownloadProgress = {
                totalBytes,
                downloadedBytes: 0,
                startTime: Date.now(),
                lastUpdate: Date.now()
            };

            let lastCheckedBytes = 0;
            const speedSamples: number[] = [];

            const stallInterval = setInterval(() => {
                if (progress.downloadedBytes === lastCheckedBytes && progress.downloadedBytes > 0) {
                    logger.warn('[Download] Stalled detected');
                    controller.abort();
                }
                lastCheckedBytes = progress.downloadedBytes;
            }, DOWNLOAD_CONFIG.STALL_CHECK_INTERVAL);

            const fileStream = createWriteStream(tempFilePath);
            fileStream.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'ENOSPC') {
                    throw new Error('Server storage full');
                }
                throw err;
            });

            const readable = Readable.fromWeb(response.body as any);

            readable.on('data', (chunk: Buffer) => {
                progress.downloadedBytes += chunk.length;

                const now = Date.now();
                if (totalBytes && now - progress.lastUpdate > 2000) {
                    const percent = Math.round((progress.downloadedBytes / totalBytes) * 100);
                    const speed = progress.downloadedBytes / ((now - progress.startTime) / 1000);

                    speedSamples.push(speed);
                    if (speedSamples.length > 5) speedSamples.shift();
                    const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;

                    const eta = totalBytes > 0 && avgSpeed > 0
                        ? Math.round((totalBytes - progress.downloadedBytes) / avgSpeed)
                        : 0;

                    updateStatus(
                        `📥 <b>Скачивание...</b>\n` +
                        `Попытка ${attempt}/${DOWNLOAD_CONFIG.MAX_ATTEMPTS} (${quality})\n` +
                        `<code>[${drawProgressBar(percent)}] ${percent}%</code>\n` +
                        `📦 ${formatBytes(progress.downloadedBytes)} / ${formatBytes(totalBytes)} MB\n` +
                        `⚡ ${formatSpeed(avgSpeed)}${eta > 0 ? ` • ETA: ${eta}s` : ''}`
                    ).catch(() => { });

                    progress.lastUpdate = now;
                }
            });

            await finished(readable.pipe(fileStream));
            clearInterval(stallInterval);

            const stats = await fs.stat(tempFilePath);
            if (stats.size < DOWNLOAD_CONFIG.MIN_FILE_SIZE) {
                throw new Error(`File too small: ${stats.size} bytes`);
            }

            const downloadTime = Date.now() - startTime;
            metrics.recordDownload(downloadTime, stats.size);

            logger.log(`[Download] ✅ Success! Size: ${formatBytes(stats.size)} MB in ${(downloadTime / 1000).toFixed(1)}s`);

            return {
                fileSize: stats.size,
                downloadTime
            };

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.warn(`[Download] ❌ Attempt ${attempt} failed: ${errorMsg}`);

            metrics.recordRetry();

            if (attempt < DOWNLOAD_CONFIG.MAX_ATTEMPTS) {
                const delay = DOWNLOAD_CONFIG.RETRY_DELAYS[attempt - 1] || 20000;
                logger.log(`[Download] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Download failed after ${DOWNLOAD_CONFIG.MAX_ATTEMPTS} attempts`);
}

// ==================== DATABASE ====================
async function updateDatabase(
    recordId: number,
    updates: Partial<typeof episodes.$inferInsert>
): Promise<void> {
    try {
        await db.update(episodes)
            .set({
                ...updates,
                updatedAt: new Date()
            })
            .where(eq(episodes.id, recordId));
    } catch (err) {
        logger.error('[DB] Update failed:', err);
    }
}

// ==================== JOB PROCESSOR ====================
async function processJob(job: Job<JobData>): Promise<void> {
    const {
        recordId,
        pageUrl,
        userId,
        chatId,
        forcedVideoId,
        epName,
        backKey,
        startMsgId
    } = job.data;

    const targetChatId = chatId || userId;
    logger.log(`[Worker] Processing Job ${job.id}: ${epName} for User ${userId}`);

    // ВАЛИДАЦИЯ
    if (!targetChatId || targetChatId === 0) {
        const err = `Invalid Chat ID: ${targetChatId}`;
        logger.error(`[Worker] ${err}`);
        await updateDatabase(recordId, {
            isProcessing: false,
            hasError: true,
            errorMessage: "Internal Error: Invalid user"
        });
        throw new Error(err);
    }

    const updateStatus = createStatusUpdater(targetChatId, startMsgId);
    let tempFilePath = '';
    const jobStartTime = Date.now();

    try {
        // STEP 1: Parse video URL
        await updateStatus(`🔍 <b>Парсинг...</b>\n${epName}`, true);

        const { directUrls, name, quality } = await extractVideoUrl(pageUrl, forcedVideoId);

        if (!directUrls?.length) {
            throw new Error('No video links found');
        }

        logger.log(`[Worker] Found ${directUrls.length} mirror(s), quality: ${quality}`);

        await updateDatabase(recordId, {
            animeName: name,
            quality: quality
        });

        // STEP 2: Download
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

        // STEP 3: Upload to Telegram
        const sizeMB = formatBytes(fileSize);
        logger.log(`[Worker] Uploading ${sizeMB} MB to Telegram...`);

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
                reply_markup: keyboard
            }
        );

        const uploadTime = Date.now() - uploadStartTime;
        metrics.recordUpload(uploadTime);

        logger.log(`[Worker] ✅ Upload complete in ${(uploadTime / 1000).toFixed(1)}s`);

        // Cleanup status message
        if (startMsgId) {
            try {
                await bot.api.deleteMessage(targetChatId, startMsgId);
            } catch { }
        }

        // Update DB with file ID
        if (message.video?.file_id) {
            await updateDatabase(recordId, {
                isProcessing: false,
                telegramFileId: message.video.file_id,
                fileSize: fileSize,
                hasError: false,
                errorMessage: null,
                lastAccessedAt: new Date(),
                accessCount: 1
            });
        }

        metrics.recordSuccess();

        const totalTime = Date.now() - jobStartTime;
        logger.log(
            `[Worker] ✅ Job ${job.id} completed in ${(totalTime / 1000).toFixed(1)}s ` +
            `(Download: ${(downloadTime / 1000).toFixed(1)}s, Upload: ${(uploadTime / 1000).toFixed(1)}s)`
        );

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        const isParserError = err instanceof ParserError;

        logger.error(`[Worker] ❌ Job ${job.id} failed:`, errorMsg);

        await updateDatabase(recordId, {
            isProcessing: false,
            hasError: true,
            errorMessage: errorMsg
        });

        const keyboard = backKey
            ? new InlineKeyboard().text('🔙 Назад', `select|${backKey}|0`)
            : undefined;

        let userMsg = `❌ <b>Ошибка:</b>\n`;

        if (isParserError) {
            const pe = err as ParserError;
            switch (pe.code) {
                case 'CAPTCHA_DETECTED':
                    userMsg += 'Сайт требует капчу. Попробуйте позже.';
                    break;
                case 'NO_HIGH_QUALITY_URLS':
                    userMsg += 'Видео высокого качества не найдено.';
                    break;
                case 'GEO_BLOCK':
                    userMsg += 'Видео заблокировано правообладателем.';
                    break;
                default:
                    userMsg += pe.message;
            }
        } else if (errorMsg.includes('too large')) {
            userMsg += 'Файл слишком большой (>2GB).';
        } else if (errorMsg.includes('timeout')) {
            userMsg += 'Превышено время ожидания.';
        } else {
            userMsg += errorMsg;
        }

        try {
            if (startMsgId) {
                await bot.api.editMessageText(
                    targetChatId,
                    startMsgId,
                    userMsg,
                    { parse_mode: 'HTML', reply_markup: keyboard }
                );
            } else {
                await bot.api.sendMessage(
                    targetChatId,
                    userMsg,
                    { parse_mode: 'HTML', reply_markup: keyboard }
                );
            }
        } catch { }

        metrics.recordFailure();

        if (isParserError && !(err as ParserError).retryable) {
            throw new Error('Non-retryable error');
        }

        throw err;

    } finally {
        await cleanupFile(tempFilePath);
    }
}

// ==================== WORKER SETUP ====================
const worker = new Worker<JobData>(
    'anime-processing',
    processJob,
    {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10)
        },
        concurrency: WORKER_CONFIG.CONCURRENCY,
        limiter: WORKER_CONFIG.RATE_LIMIT,
        settings: {
            backoffStrategy: (attemptsMade: number) => {
                return Math.min(1000 * Math.pow(2, attemptsMade), 60000);
            }
        }
    }
);

// Events
worker.on('completed', (job) => {
    logger.log(`[Worker] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    logger.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
    logger.error('[Worker] ⚠️ Error:', err);
});

// Graceful shutdown
async function shutdown() {
    logger.log('[Worker] Shutting down...');
    await worker.close();
    const stats = metrics.getStats();
    logger.log('[Worker] Final stats:', JSON.stringify(stats, null, 2));
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Metrics logging
setInterval(() => {
    const stats = metrics.getStats();
    logger.log('[Metrics]', JSON.stringify(stats, null, 2));
}, WORKER_CONFIG.METRICS_LOG_INTERVAL);

logger.log('[Worker] 🚀 Started');
logger.log(`[Worker] Concurrency: ${WORKER_CONFIG.CONCURRENCY}, Rate: ${WORKER_CONFIG.RATE_LIMIT.max}/min`);

export { worker, metrics };