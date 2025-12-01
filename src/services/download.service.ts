import { videoQueue, bot } from '../core';
import { episodeRepository } from '../db/repositories/episode.repository';
import { logger } from '../utils/logger';

interface EnqueueParams {
    userId: number;
    chatId: number;
    pageUrl: string;
    sourceVideoId: string;
    episodeName: string;
    animeName: string;
    backKey?: string;
    startMsgId?: number;
}

export const downloadService = {
    async enqueue(params: EnqueueParams) {
        const { userId, chatId, pageUrl, sourceVideoId, episodeName, animeName, backKey, startMsgId } = params;

        // 1. Проверяем кэш в БД (уже скачано?)
        const existingEp = await episodeRepository.findBySourceVideoId(sourceVideoId);
        
        if (existingEp?.telegramFileId) {
            logger.log(`[DownloadService] Found in cache: ${sourceVideoId}`);
            await episodeRepository.incrementAccessCount(existingEp.id);
            
            // Если это API запрос, мы просто вернем fileId, а контроллер отправит
            return { status: 'cached', fileId: existingEp.telegramFileId, animeName: existingEp.animeName };
        }

        if (existingEp?.isProcessing) {
            return { status: 'processing' };
        }

        // 2. Создаем запись в БД
        const epNum = parseInt(episodeName.replace(/\D/g, ''), 10) || 0;
        
        const newEp = await episodeRepository.upsert({
            animeName: animeName || 'Загрузка...',
            episodeNumber: epNum,
            sourceVideoId: sourceVideoId,
            pageUrl: pageUrl,
            isProcessing: true,
        });

        if (!newEp) throw new Error('Failed to create DB record');

        // 3. Добавляем в очередь Redis
        await videoQueue.add('process-video', {
            recordId: newEp.id,
            pageUrl,
            forcedVideoId: sourceVideoId,
            epName: episodeName,
            userId,
            chatId,
            backKey,
            startMsgId
        });

        logger.log(`[DownloadService] Enqueued job for ${episodeName} (User: ${userId})`);
        return { status: 'queued', jobId: newEp.id };
    }
};