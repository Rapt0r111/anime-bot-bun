// src/bot/middlewares/subscriber.middleware.ts

import type { BotContext } from '../../types';
import { subscriberRepository } from '../../db/repositories/subscriber.repository';
import { logger } from '../../utils/logger';

// Кэш для быстрой проверки
const subscriberCache = new Set<number>();

/**
 * Инициализация кэша подписчиков при старте
 */
export async function bootstrapSubscriberCache(): Promise<void> {
  try {
    const chatIds = await subscriberRepository.getAllChatIds();
    chatIds.forEach(id => subscriberCache.add(id));
    logger.log(`[Subscribers] Cached ${subscriberCache.size} chats`);
  } catch (err) {
    logger.error('[Subscribers] Failed to bootstrap cache:', err);
  }
}

/**
 * Middleware для автоматического добавления/обновления подписчика
 */
export async function subscriberMiddleware(ctx: BotContext, next: () => Promise<void>) {
  const chatId = ctx.chat?.id;
  
  if (!chatId) {
    return next();
  }

  // Если уже в кэше, пропускаем
  if (subscriberCache.has(chatId)) {
    return next();
  }

  try {
    await subscriberRepository.upsert({
      chatId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      languageCode: ctx.from?.language_code,
    });

    subscriberCache.add(chatId);
    logger.log(`[Subscribers] Added new subscriber: ${chatId}`);
  } catch (err) {
    logger.error('[Subscribers] Failed to add subscriber:', err);
  }

  return next();
}

/**
 * Удалить подписчика из кэша и БД
 */
export async function removeSubscriber(chatId: number): Promise<void> {
  try {
    await subscriberRepository.remove(chatId);
    subscriberCache.delete(chatId);
    logger.log(`[Subscribers] Removed subscriber: ${chatId}`);
  } catch (err) {
    logger.error('[Subscribers] Failed to remove subscriber:', err);
  }
}

/**
 * Получить всех подписчиков
 */
export async function getAllSubscribers() {
  return subscriberRepository.getAll();
}

// Инициализация при импорте
bootstrapSubscriberCache();