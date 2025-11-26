import type { AnimeCard, AnimePageData, SearchResult } from '../types';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
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