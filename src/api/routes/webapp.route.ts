// src/api/routes/webapp.route.ts

import { Elysia, t } from 'elysia';
import { getLatestAnime, searchAnime, getAnimeSeries } from '../../services/parser';
import { videoQueue } from '../../core';
import { episodeRepository } from '../../db/repositories/episode.repository';
import { logger } from '../../utils/logger';

export const webappRoute = new Elysia({ prefix: '/api/anime' })
  // Get latest releases
  .get('/latest', async ({ query }) => {
    const page = query.page ? parseInt(query.page as string, 10) : 1;
    try {
      const items = await getLatestAnime(page);
      return items;
    } catch (err) {
      logger.error('[WebApp] Latest error:', err);
      throw new Error('Failed to fetch latest');
    }
  })

  // Search anime
  .get('/search', async ({ query }) => {
    const q = query.q as string;
    if (!q || q.length < 2) return { error: 'Query too short' };
    try {
      return await searchAnime(q);
    } catch (err) {
      logger.error('[WebApp] Search error:', err);
      throw new Error('Search failed');
    }
  })

  // Get anime series
  .post('/series', async ({ body }) => {
    const { pageUrl } = body as { pageUrl: string };
    if (!pageUrl) return { error: 'Missing pageUrl' };
    try {
      return await getAnimeSeries(pageUrl);
    } catch (err) {
      logger.error('[WebApp] Series error:', err);
      throw new Error('Failed to fetch series');
    }
  })

  // Download episode
  .post('/download', async ({ body, set }) => {
    const { pageUrl, videoId, episodeName, userId, animeName } = body as {
      pageUrl: string;
      videoId: string;
      episodeName: string;
      userId: number;
      animeName?: string;
    };

    // ВАЖНО: Если данных нет, ставим статус 400
    if (!pageUrl || !videoId || !episodeName || !userId) {
      logger.warn(`[WebApp] Missing params: URL=${!!pageUrl}, VID=${!!videoId}, Name=${!!episodeName}, UID=${userId}`);
      set.status = 400; // <--- ОШИБКА КЛИЕНТА
      return { error: 'Missing parameters (userId is required). Please open via Telegram.' };
    }

    try {
      const existing = await episodeRepository.findBySourceVideoId(videoId);

      if (existing?.telegramFileId) {
        // Пробуем отправить сразу
        try {
          const { bot } = await import('../../core'); 
          await bot.api.sendVideo(userId, existing.telegramFileId, {
             caption: `🎬 <b>${existing.animeName}</b>\n${episodeName}\n⚡️ <i>Из кэша</i>`,
             parse_mode: 'HTML'
          });
        } catch (botErr) {
           logger.warn(`[WebApp] Failed to send cached video: ${botErr}`);
        }
        return { success: true, cached: true, fileId: existing.telegramFileId };
      }

      if (existing?.isProcessing) {
        return { success: false, error: 'Already processing' };
      }

      const epNum = parseInt(episodeName.replace(/\D/g, ''), 10) || 0;

      const newEp = await episodeRepository.upsert({
        animeName: animeName || 'Processing...',
        episodeNumber: epNum,
        sourceVideoId: videoId,
        pageUrl: pageUrl,
        isProcessing: true
      });

      if (!newEp) throw new Error('Failed to create job');

      await videoQueue.add('process-video', {
        recordId: newEp.id,
        pageUrl,
        forcedVideoId: videoId,
        epName: episodeName,
        userId: Number(userId),
        chatId: Number(userId)
      });

      logger.log(`[WebApp] Job enqueued for user ${userId}, episode: ${episodeName}`);
      return { success: true, jobId: newEp.id };

    } catch (err) {
      logger.error('[WebApp] Download error:', err);
      set.status = 500;
      return { error: 'Internal Server Error' };
    }
  })

  .get('/downloads', async () => {
    try {
      return await episodeRepository.getStats();
    } catch (err) {
      return { error: 'Failed' };
    }
  });