export interface AnimeCard {
  title: string;
  url: string;
  imageUrl: string;
  description: string;
}

export interface SearchResult {
  title: string;
  url: string;
  id: string;
}

export interface AnimePageData {
  name: string;
  imageUrl?: string;
  description: string;
  meta?: string;
  series: Episode[];
}

export interface Episode {
  name: string;
  id: string;
}

export interface Download {
  id: string;
  animeName: string;
  episodeName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileId?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface Stats {
  uptime: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    totalEpisodes: number;
    cachedEpisodes: number;
    processingEpisodes: number;
    failedEpisodes: number;
    totalSubscribers: number;
    cacheHitRate: number;
  };
}