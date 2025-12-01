import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Sparkles, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { api } from '../lib/api';
import type { AnimeCard as AnimeCardType } from '../types';
import { useState } from 'react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  // Используем keepPreviousData: true (или placeholderData в новых версиях react-query),
  // чтобы список не мигал при переключении страниц
  const { data: latest, isLoading, isFetching } = useQuery({
    queryKey: ['latest', page],
    queryFn: () => api.getLatest(page),
  });

  const handlePrev = () => {
    if (page > 1) {
      setPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    // Если пришли данные и их не 0, можно идти дальше
    if (latest && latest.length > 0) {
      setPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="pb-24"> {/* Увеличили отступ снизу для пагинации */}
      
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

      {/* Stats Banner - Показываем только на 1 странице */}
      {page === 1 && (
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
      )}

      {/* Latest Releases */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🔥</span>
            Latest Releases
            {page > 1 && <span className="text-sm font-normal text-gray-400 ml-2">(Page {page})</span>}
          </h2>
          {isFetching && page > 1 && <Loader2 className="w-5 h-5 animate-spin text-purple-400" />}
        </motion.div>

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
          <>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[50vh]"
              variants={container}
              initial="hidden"
              animate="show"
              // Ключ заставляет анимацию перезапускаться при смене страницы
              key={page} 
            >
              {latest?.map((anime: AnimeCardType) => (
                <motion.div key={anime.url} variants={item}>
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination Controls */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={page === 1 || isFetching}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all
                  ${page === 1 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-800 text-white hover:bg-purple-600 hover:text-white border border-slate-700 hover:border-purple-500'
                  }
                `}
              >
                <ChevronLeft className="w-5 h-5" />
                Prev
              </button>

              <span className="text-slate-400 font-medium px-2">
                Page {page}
              </span>

              <button
                onClick={handleNext}
                disabled={(latest && latest.length === 0) || isFetching}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all
                  ${(latest && latest.length === 0)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-800 text-white hover:bg-purple-600 hover:text-white border border-slate-700 hover:border-purple-500'
                  }
                `}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}