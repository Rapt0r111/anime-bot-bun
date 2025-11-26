// src/db/repositories/release.repository.ts

import { db } from '../../core';
import { releaseNotifications } from '../schema';
import { inArray } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export class ReleaseRepository {
  /**
   * Получить существующие release ID
   */
  async findExistingReleases(releaseIds: string[]) {
    try {
      return await db
        .select({ releaseId: releaseNotifications.releaseId })
        .from(releaseNotifications)
        .where(inArray(releaseNotifications.releaseId, releaseIds));
    } catch (err) {
      logger.error('[ReleaseRepo] findExistingReleases error:', err);
      throw err;
    }
  }

  /**
   * Создать уведомления о релизах
   */
  async createReleases(
    releases: Array<{
      releaseId: string;
      title: string;
      url: string;
      imageUrl?: string;
      description?: string;
    }>
  ) {
    try {
      await db
        .insert(releaseNotifications)
        .values(releases)
        .onConflictDoNothing();
    } catch (err) {
      logger.error('[ReleaseRepo] createReleases error:', err);
      throw err;
    }
  }
}

export const releaseRepository = new ReleaseRepository();