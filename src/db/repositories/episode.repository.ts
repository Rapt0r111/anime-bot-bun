// src/db/repositories/episode.repository.ts

import { db } from '../../core';
import { episodes } from '../schema';
import { eq, sql, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export class EpisodeRepository {
  /**
   * Найти эпизод по source video ID
   */
  async findBySourceVideoId(videoId: string) {
    try {
      return await db.query.episodes.findFirst({
        where: eq(episodes.sourceVideoId, videoId),
      });
    } catch (err) {
      logger.error('[EpisodeRepo] findBySourceVideoId error:', err);
      throw err;
    }
  }

  /**
   * Создать или обновить эпизод
   */
  async upsert(data: {
    animeName: string;
    episodeNumber: number;
    sourceVideoId: string;
    pageUrl: string;
    isProcessing: boolean;
  }) {
    try {
      const [result] = await db
        .insert(episodes)
        .values(data)
        .onConflictDoUpdate({
          target: episodes.sourceVideoId,
          set: {
            isProcessing: data.isProcessing,
            hasError: false,
            errorMessage: null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result;
    } catch (err) {
      logger.error('[EpisodeRepo] upsert error:', err);
      throw err;
    }
  }

  /**
   * Обновить статус эпизода
   */
  async update(
    recordId: number,
    updates: Partial<typeof episodes.$inferInsert>
  ) {
    try {
      await db
        .update(episodes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, recordId));
    } catch (err) {
      logger.error('[EpisodeRepo] update error:', err);
      throw err;
    }
  }

  /**
   * Увеличить счетчик доступа
   */
  async incrementAccessCount(recordId: number) {
    try {
      await db
        .update(episodes)
        .set({
          accessCount: sql`${episodes.accessCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(episodes.id, recordId));
    } catch (err) {
      logger.error('[EpisodeRepo] incrementAccessCount error:', err);
    }
  }

  /**
   * Получить топ аниме по просмотрам
   */
  async getTopAnime(limit: number = 10) {
    try {
      return await db
        .select({
          name: episodes.animeName,
          views: sql<number>`sum(access_count)::int`,
          episodes: sql<number>`count(*)::int`,
        })
        .from(episodes)
        .groupBy(episodes.animeName)
        .orderBy(desc(sql`sum(access_count)`))
        .limit(limit);
    } catch (err) {
      logger.error('[EpisodeRepo] getTopAnime error:', err);
      throw err;
    }
  }

  /**
   * Получить последние ошибки
   */
  async getRecentErrors(limit: number = 20) {
    try {
      return await db
        .select({
          id: episodes.id,
          animeName: episodes.animeName,
          episodeNumber: episodes.episodeNumber,
          error: episodes.errorMessage,
          timestamp: episodes.updatedAt,
        })
        .from(episodes)
        .where(sql`has_error = true`)
        .orderBy(desc(episodes.updatedAt))
        .limit(limit);
    } catch (err) {
      logger.error('[EpisodeRepo] getRecentErrors error:', err);
      throw err;
    }
  }

  /**
   * Очистить старый кэш
   */
  async cleanupOldCache(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db
        .delete(episodes)
        .where(
          sql`last_accessed_at < ${cutoffDate} AND telegram_file_id IS NOT NULL`
        )
        .returning({ id: episodes.id });

      logger.log(`[EpisodeRepo] Cleaned up ${deleted.length} old cache entries`);
      return deleted.length;
    } catch (err) {
      logger.error('[EpisodeRepo] cleanupOldCache error:', err);
      throw err;
    }
  }

  /**
   * Получить статистику БД
   */
  async getStats() {
    try {
      const [dbStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          cached: sql<number>`count(*) filter (where telegram_file_id is not null)::int`,
          processing: sql<number>`count(*) filter (where is_processing = true)::int`,
          failed: sql<number>`count(*) filter (where has_error = true)::int`,
        })
        .from(episodes);

      return dbStats || { total: 0, cached: 0, processing: 0, failed: 0 };
    } catch (err) {
      logger.error('[EpisodeRepo] getStats error:', err);
      throw err;
    }
  }
}

export const episodeRepository = new EpisodeRepository();