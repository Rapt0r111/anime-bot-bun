import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Sparkles } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { api } from '../lib/api';
import type { AnimeCard as AnimeCardType } from '../types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  const navigate = useNavigate();

  const { data: latest, isLoading } = useQuery({
    queryKey: ['latest'],
    queryFn: () => api.getLatest()
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <motion.div 
        className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-purple-500/20"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AnimeVost
              </h1>
            </div>
            
            <motion.button
              onClick={() => navigate('/search')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white font-medium transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4" />
              Search
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats Banner */}
      <motion.div
        className="max-w-7xl mx-auto px-4 py-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Download className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Download in 1080p</h2>
              <p className="text-purple-200 text-sm">Fast & Free • No Ads</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Latest Releases */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.h2 
          className="text-2xl font-bold text-white mb-6 flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-3xl">🔥</span>
          Latest Releases
        </motion.h2>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-slate-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {latest?.slice(0, 10).map((anime: AnimeCardType) => (
              <motion.div key={anime.url} variants={item}>
                <AnimeCard anime={anime} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}