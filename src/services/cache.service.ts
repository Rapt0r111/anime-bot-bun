// src/services/cache.service.ts

import { CACHE_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Сервис для кэширования коротких URL
 */
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private ttl: number = CACHE_CONFIG.URL_TTL) {
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      CACHE_CONFIG.CLEANUP_INTERVAL
    );
  }

  /**
   * Сохранить URL и получить короткий ID
   */
  save(url: string): string {
    const shortId = this.generateId();
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(shortId, { url, expiresAt });
    return shortId;
  }

  /**
   * Получить URL по короткому ID
   */
  get(shortId: string): string | undefined {
    const entry = this.cache.get(shortId);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(shortId);
      return undefined;
    }

    return entry.url;
  }

  /**
   * Генерировать случайный ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Очистить устаревшие записи
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.log(`[CacheService] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Уничтожить сервис
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }

  /**
   * Получить размер кэша
   */
  get size(): number {
    return this.cache.size;
  }
}

export const cacheService = new CacheService();