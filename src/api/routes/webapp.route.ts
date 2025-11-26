// src/api/routes/webapp.route.ts

import { Elysia, t } from 'elysia';
import { getLatestAnime, searchAnime, getAnimeSeries } from '../../services/parser';
import { videoQueue } from '../../core';
import { episodeRepository } from '../../db/repositories/episode.repository';
import { logger } from '../../utils/logger';

export const webappRoute = new Elysia({ prefix: '/api/anime' })
  // Get latest releases
  .get('/latest', async () => {
    try {
      const items = await getLatestAnime();
      return items.slice(0, 10);
    } catch (err) {
      logger.error('[WebApp] Latest error:', err);
      throw new Error('Failed to fetch latest');
    }
  })

  // Search anime
  .get('/search', async ({ query }) => {
    const q = query.q as string;
    
    if (!q || q.length < 2) {
      return { error: 'Query too short' };
    }

    try {
      const results = await searchAnime(q);
      return results;
    } catch (err) {
      logger.error('[WebApp] Search error:', err);
      throw new Error('Search failed');
    }
  })

  // Get anime series
  .post('/series', async ({ body }) => {
    const { pageUrl } = body as { pageUrl: string };

    if (!pageUrl) {
      return { error: 'Missing pageUrl' };
    }

    try {
      const anime = await getAnimeSeries(pageUrl);
      return anime;
    } catch (err) {
      logger.error('[WebApp] Series error:', err);
      throw new Error('Failed to fetch series');
    }
  })

  // Download episode
  .post('/download', async ({ body }) => {
    const { pageUrl, videoId, episodeName } = body as {
      pageUrl: string;
      videoId: string;
      episodeName: string;
    };

    if (!pageUrl || !videoId || !episodeName) {
      return { error: 'Missing parameters' };
    }

    try {
      // Check cache first
      const existing = await episodeRepository.findBySourceVideoId(videoId);

      if (existing?.telegramFileId) {
        return {
          success: true,
          cached: true,
          fileId: existing.telegramFileId
        };
      }

      if (existing?.isProcessing) {
        return {
          success: false,
          error: 'Already processing'
        };
      }

      // Create download job
      const epNum = parseInt(episodeName.replace(/\D/g, ''), 10) || 0;

      const newEp = await episodeRepository.upsert({
        animeName: 'Processing...',
        episodeNumber: epNum,
        sourceVideoId: videoId,
        pageUrl: pageUrl,
        isProcessing: true
      });

      if (!newEp) {
        throw new Error('Failed to create job');
      }

      // Add to queue
      await videoQueue.add('process-video', {
        recordId: newEp.id,
        pageUrl,
        forcedVideoId: videoId,
        epName: episodeName,
        userId: 0, // WebApp doesn't have userId
        chatId: 0
      });

      return {
        success: true,
        jobId: newEp.id
      };
    } catch (err) {
      logger.error('[WebApp] Download error:', err);
      throw new Error('Failed to start download');
    }
  })

  // Get downloads status
  .get('/downloads', async () => {
    try {
      const stats = await episodeRepository.getStats();
      return {
        processing: stats.processing,
        cached: stats.cached,
        failed: stats.failed
      };
    } catch (err) {
      logger.error('[WebApp] Downloads error:', err);
      throw new Error('Failed to fetch downloads');
    }
  });