// src/services/subscriber.service.ts

import { subscriberRepository } from '../db/repositories/subscriber.repository';
import { logger } from '../utils/logger';

/**
 * Сервис для управления подписчиками
 */
export class SubscriberService {
  /**
   * Добавить или обновить подписчика
   */
  async upsertSubscriber(data: {
    chatId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<void> {
    try {
      await subscriberRepository.upsert({
        chatId: data.chatId,
        username: data.username || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        languageCode: data.languageCode || null,
      });
    } catch (err) {
      logger.error('[SubscriberService] Failed to upsert:', err);
      throw err;
    }
  }

  /**
   * Удалить подписчика
   */
  async removeSubscriber(chatId: number): Promise<void> {
    try {
      await subscriberRepository.remove(chatId);
      logger.log(`[SubscriberService] Removed subscriber: ${chatId}`);
    } catch (err) {
      logger.error('[SubscriberService] Failed to remove:', err);
      throw err;
    }
  }

  /**
   * Получить всех подписчиков
   */
  async getAllSubscribers() {
    try {
      return await subscriberRepository.getAll();
    } catch (err) {
      logger.error('[SubscriberService] Failed to get all:', err);
      throw err;
    }
  }

  /**
   * Получить количество подписчиков
   */
  async getSubscriberCount(): Promise<number> {
    try {
      return await subscriberRepository.getCount();
    } catch (err) {
      logger.error('[SubscriberService] Failed to get count:', err);
      throw err;
    }
  }

  /**
   * Проверить существование подписчика
   */
  async subscriberExists(chatId: number): Promise<boolean> {
    try {
      const subscribers = await subscriberRepository.getAll();
      return subscribers.some(sub => Number(sub.chatId) === chatId);
    } catch (err) {
      logger.error('[SubscriberService] Failed to check existence:', err);
      return false;
    }
  }
}

export const subscriberService = new SubscriberService();