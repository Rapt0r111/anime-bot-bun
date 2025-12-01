// webapp/src/lib/api.ts - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ

import type { AnimeCard, AnimePageData, SearchResult } from '../types';

const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:8080' 
  : 'https://rapt0rs.duckdns.org';

// ==================== TYPES ====================
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000
};

// ==================== UTILITIES ====================
function getTelegramUserId(): number | null {
  try {
    // @ts-ignore
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    if (user?.id) {
      console.log('[API] ✅ Telegram User Detected:', user.id);
      return user.id;
    }
  } catch (err) {
    console.error('[API] Error accessing Telegram object:', err);
  }

  if (import.meta.env.DEV) {
    console.warn('[API] ⚠️ DEV mode: User not found');
  }

  console.error('[API] ❌ User not found in Production');
  return null;
}

function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  
  // Добавляем jitter для избежания thundering herd
  const jitter = Math.random() * 1000;
  
  return exponentialDelay + jitter;
}

// ==================== REQUEST QUEUE ====================
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minInterval = 100; // Минимум 100мс между запросами

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        );
      }
      
      const fn = this.queue.shift();
      if (fn) {
        this.lastRequestTime = Date.now();
        await fn();
      }
    }
    
    this.processing = false;
  }
}

// ==================== API CLIENT ====================
class ApiClient {
  private requestQueue = new RequestQueue();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 минут

  private getCacheKey(endpoint: string, options?: RequestInit): string {
    return `${endpoint}:${JSON.stringify(options?.body || '')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async fetchWithRetry<T>(
    endpoint: string, 
    options?: RequestInit,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers
          }
        });

        // Обработка rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : calculateRetryDelay(attempt, config);
          
          console.warn(`[API] Rate limited. Retrying after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        console.error(`[API] Request failed (attempt ${attempt + 1}):`, error);
        
        // Не делаем retry на финальной попытке
        if (attempt < config.maxRetries) {
          const delay = calculateRetryDelay(attempt, config);
          console.log(`[API] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Request failed');
  }

  private async fetch<T>(
    endpoint: string, 
    options?: RequestInit,
    useCache: boolean = true
  ): Promise<T> {
    // Проверяем кэш для GET запросов
    if (useCache && (!options || options.method === 'GET')) {
      const cacheKey = this.getCacheKey(endpoint, options);
      const cached = this.getFromCache<T>(cacheKey);
      
      if (cached) {
        console.log(`[API] Cache hit: ${endpoint}`);
        return cached;
      }
    }

    // Добавляем в очередь для контроля rate limiting
    const result = await this.requestQueue.add(() => 
      this.fetchWithRetry<T>(endpoint, options)
    );

    // Сохраняем в кэш GET запросы
    if (useCache && (!options || options.method === 'GET')) {
      const cacheKey = this.getCacheKey(endpoint, options);
      this.setCache(cacheKey, result);
    }

    return result;
  }

  async getLatest(page: number = 1): Promise<AnimeCard[]> {
    return this.fetch(`/api/anime/latest?page=${page}`);
  }

  async searchAnime(query: string): Promise<SearchResult[]> {
    return this.fetch(`/api/anime/search?q=${encodeURIComponent(query)}`);
  }

  async getAnimeSeries(pageUrl: string): Promise<AnimePageData> {
    return this.fetch('/api/anime/series', {
      method: 'POST',
      body: JSON.stringify({ pageUrl })
    }, true); // Кэшируем серии
  }

  async downloadEpisode(
    pageUrl: string, 
    videoId: string, 
    episodeName: string, 
    animeName: string
  ) {
    const userId = getTelegramUserId();
    
    if (!userId) {
      throw new Error(
        "Не удалось определить пользователя. " +
        "Откройте приложение через Telegram."
      );
    }
    
    console.log(`[API] Download request: User ${userId}, Anime: ${animeName}`);

    // Не кэшируем download запросы
    return this.fetch('/api/anime/download', {
      method: 'POST',
      body: JSON.stringify({ 
        pageUrl, 
        videoId, 
        episodeName, 
        animeName,
        userId
      })
    }, false);
  }

  async getDownloads() {
    return this.fetch('/api/anime/downloads', undefined, false);
  }

  async getStats() {
    return this.fetch('/api/stats');
  }

  // Метод для очистки кэша
  clearCache() {
    this.cache.clear();
    console.log('[API] Cache cleared');
  }

  // Метод для проверки здоровья API
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('/health', undefined, false);
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();

// Экспортируем для использования в React Query
export type { ApiClient };