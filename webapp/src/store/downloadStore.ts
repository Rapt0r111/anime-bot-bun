import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Download } from '../types';

interface DownloadStore {
  downloads: Download[];
  addDownload: (download: Download) => void;
  updateDownload: (id: string, updates: Partial<Download>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set) => ({
      downloads: [],
      
      addDownload: (download) =>
        set((state) => ({
          downloads: [download, ...state.downloads]
        })),
      
      updateDownload: (id, updates) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          )
        })),
      
      removeDownload: (id) =>
        set((state) => ({
          downloads: state.downloads.filter((d) => d.id !== id)
        })),
      
      clearCompleted: () =>
        set((state) => ({
          downloads: state.downloads.filter((d) => d.status !== 'completed')
        }))
    }),
    {
      name: 'anime-downloads'
    }
  )
);