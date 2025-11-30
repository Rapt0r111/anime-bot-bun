import type { AnimeCard, AnimePageData, SearchResult } from '../types';

// КРИТИЧНО: Определяем базовый URL для API
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost' 
  : 'http://rapt0rs.duckdns.org'; // Ваш production URL

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    console.log('[API] Fetching:', url);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('[API] Request failed:', error);
      throw error;
    }
  }

  async getLatest(): Promise<AnimeCard[]> {
    return this.fetch('/api/anime/latest');
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

  async downloadEpisode(pageUrl: string, videoId: string, episodeName: string) {
    return this.fetch('/api/anime/download', {
      method: 'POST',
      body: JSON.stringify({ pageUrl, videoId, episodeName })
    });
  }

  async getDownloads() {
    return this.fetch('/api/downloads');
  }

  async getStats() {
    return this.fetch('/api/stats');
  }
}

export const api = new ApiClient();