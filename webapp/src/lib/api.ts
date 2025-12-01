// webapp/src/lib/api.ts

import type { AnimeCard, AnimePageData, SearchResult } from '../types';

// Определяем базовый URL
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:8080' 
  : 'https://rapt0rs.duckdns.org';

// ВАШ ID ТОЛЬКО ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ

// Надежная функция получения ID
const getTelegramUserId = (): number | null => {
  try {
    // 1. Проверяем наличие объекта Telegram и пользователя
    // @ts-ignore
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    if (user?.id) {
      console.log('[API] ✅ Telegram User Detected:', user.id);
      return user.id;
    }
  } catch (err) {
    console.error('[API] Error accessing Telegram object:', err);
  }

  // 2. Если пользователя нет, проверяем режим запуска
  if (import.meta.env.DEV) {
    console.warn('[API] ⚠️ User not found. Using DEV FALLBACK ID.');
  }

  // 3. Если это продакшен и пользователя нет — возвращаем null (ошибка)
  console.error('[API] ❌ User not found in Production mode.');
  return null;
};

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      return data;
    } catch (error) {
      console.error('[API] Request failed:', error);
      throw error;
    }
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
    });
  }

  // Метод скачивания
  async downloadEpisode(pageUrl: string, videoId: string, episodeName: string, animeName: string) {
    const userId = getTelegramUserId();
    
    // 🔥 ВАЖНАЯ ПРОВЕРКА
    if (!userId) {
      // Эта ошибка всплывет в модальном окне (красный крестик)
      throw new Error("Не удалось определить пользователя. Пожалуйста, откройте приложение через Telegram.");
    }
    
    console.log(`[API] Sending download request. User: ${userId}, Anime: ${animeName}`);

    return this.fetch('/api/anime/download', {
      method: 'POST',
      body: JSON.stringify({ 
          pageUrl, 
          videoId, 
          episodeName, 
          animeName,
          userId // Отправляем ID (число)
      })
    });
  }

  async getDownloads() {
    return this.fetch('/api/anime/downloads');
  }

  async getStats() {
    return this.fetch('/api/stats');
  }
}

export const api = new ApiClient();