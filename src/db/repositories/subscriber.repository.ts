// src/db/repositories/subscriber.repository.ts

import { db } from '../../core';
import { subscribers } from '../schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export class SubscriberRepository {
  /**
   * Создать или обновить подписчика
   */
  async upsert(data: {
    chatId: number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    languageCode?: string | null;
  }) {
    try {
      const timestamp = new Date();
      const payload = {
        chatId: data.chatId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        languageCode: data.languageCode ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db
        .insert(subscribers)
        .values(payload)
        .onConflictDoUpdate({
          target: subscribers.chatId,
          set: {
            username: payload.username,
            firstName: payload.firstName,
            lastName: payload.lastName,
            languageCode: payload.languageCode,
            updatedAt: timestamp,
          },
        });
    } catch (err) {
      logger.error('[SubscriberRepo] upsert error:', err);
      throw err;
    }
  }

  /**
   * Удалить подписчика
   */
  async remove(chatId: number) {
    try {
      await db.delete(subscribers).where(eq(subscribers.chatId, chatId));
    } catch (err) {
      logger.error('[SubscriberRepo] remove error:', err);
      throw err;
    }
  }

  /**
   * Получить всех подписчиков
   */
  async getAll() {
    try {
      return await db.select().from(subscribers);
    } catch (err) {
      logger.error('[SubscriberRepo] getAll error:', err);
      throw err;
    }
  }

  /**
   * Получить все chat ID подписчиков
   */
  async getAllChatIds(): Promise<number[]> {
    try {
      const rows = await db
        .select({ chatId: subscribers.chatId })
        .from(subscribers);
      return rows.map(row => Number(row.chatId));
    } catch (err) {
      logger.error('[SubscriberRepo] getAllChatIds error:', err);
      throw err;
    }
  }

  /**
   * Получить количество подписчиков
   */
  async getCount(): Promise<number> {
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscribers);
      return count || 0;
    } catch (err) {
      logger.error('[SubscriberRepo] getCount error:', err);
      throw err;
    }
  }
}

export const subscriberRepository = new SubscriberRepository();