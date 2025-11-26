import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Download, Loader2 } from 'lucide-react';
import { useHapticFeedback } from '@telegram-apps/sdk-react';
import { useState } from 'react';
import { api } from '../lib/api';
import EpisodeGrid from '../components/EpisodeGrid';
import DownloadModal from '../components/DownloadModal';

export default function AnimePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const haptic = useHapticFeedback();
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);

  const pageUrl = atob(id || '');

  const { data: anime, isLoading } = useQuery({
    queryKey: ['anime', pageUrl],
    queryFn: () => api.getAnimeSeries(pageUrl),
    enabled: !!pageUrl
  });

  const handleEpisodeClick = (episode: any) => {
    haptic?.impactOccurred('light');
    setSelectedEpisode(episode);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Anime not found</p>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Hero Section */}
      <div className="relative h-[40vh] overflow-hidden">
        {anime.imageUrl && (
          <>
            <img
              src={anime.imageUrl}
              alt={anime.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <motion.h1
            className="text-3xl font-bold text-white mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {anime.name}
          </motion.h1>
          
          {anime.meta && (
            <motion.p
              className="text-purple-300 text-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {anime.meta}
            </motion.p>
          )}
        </div>
      </div>

      {/* Description */}
      {anime.description && (
        <motion.div
          className="px-6 py-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">
            {anime.description}
          </p>
        </motion.div>
      )}

      {/* Episodes */}
      <div className="px-6 py-4">
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-bold text-white">Episodes</h2>
          <div className="px-3 py-1 bg-purple-600/20 rounded-full text-purple-300 text-sm font-medium">
            {anime.series.length} episodes
          </div>
        </motion.div>

        <EpisodeGrid
          episodes={anime.series}
          onEpisodeClick={handleEpisodeClick}
        />
      </div>

      {/* Download Modal */}
      <AnimatePresence>
        {selectedEpisode && (
          <DownloadModal
            episode={selectedEpisode}
            animeName={anime.name}
            pageUrl={pageUrl}
            onClose={() => setSelectedEpisode(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}