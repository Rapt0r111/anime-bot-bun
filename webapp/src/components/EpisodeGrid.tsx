import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Play } from 'lucide-react';

interface Episode {
  name: string;
  id: string;
}

interface Props {
  episodes: Episode[];
  onEpisodeClick: (episode: Episode) => void;
}

export default function EpisodeGrid({ episodes, onEpisodeClick }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(episodes.length / 5),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  });

  const getEpisodesForRow = (rowIndex: number) => {
    const startIndex = rowIndex * 5;
    return episodes.slice(startIndex, startIndex + 5);
  };

  return (
    <div
      ref={parentRef}
      className="max-h-[60vh] overflow-auto space-y-2"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#7c3aed transparent'
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowEpisodes = getEpisodesForRow(virtualRow.index);
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <div className="grid grid-cols-5 gap-2">
                {rowEpisodes.map((episode, idx) => {
                  const episodeNumber = virtualRow.index * 5 + idx + 1;
                  
                  return (
                    <motion.button
                      key={episode.id}
                      onClick={() => onEpisodeClick(episode)}
                      className="relative aspect-video rounded-lg bg-gradient-to-br from-purple-900/40 to-purple-600/20 border border-purple-500/30 overflow-hidden group hover:border-purple-400 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {/* Episode Number */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform">
                          {episodeNumber}
                        </span>
                      </div>

                      {/* Play Icon on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <Play className="w-6 h-6 text-white" fill="white" />
                      </div>

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}