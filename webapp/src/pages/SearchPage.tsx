import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useHapticFeedback } from '@telegram-apps/sdk-react';
import { api } from '../lib/api';
import AnimeCard from '../components/AnimeCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const haptic = useHapticFeedback();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.searchAnime(debouncedQuery),
    enabled: debouncedQuery.length >= 2
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClear = () => {
    setQuery('');
    haptic?.impactOccurred('light');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Search Bar */}
      <motion.div
        className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-purple-500/20"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime..."
              className="w-full pl-12 pr-12 py-3 bg-slate-900 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
            />

            {query && (
              <motion.button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {isLoading && (
            <motion.div
              key="loading"
              className="flex items-center justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </motion.div>
          )}

          {/* No Query */}
          {!query && !isLoading && (
            <motion.div
              key="empty"
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Search className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
              <p className="text-gray-400">Start typing to search anime...</p>
            </motion.div>
          )}

          {/* No Results */}
          {debouncedQuery && !isLoading && results?.length === 0 && (
            <motion.div
              key="no-results"
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <p className="text-gray-400">
                No results found for "{debouncedQuery}"
              </p>
            </motion.div>
          )}

          {/* Results Grid */}
          {results && results.length > 0 && (
            <motion.div
              key="results"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {results.map((anime, index) => (
                <motion.div
                  key={anime.url}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AnimeCard 
                    anime={{
                      title: anime.title,
                      url: anime.url,
                      // Search APIs usually return 'image' instead of 'imageUrl'
                      // We cast it here and provide a fallback description
                      imageUrl: (anime as any).image || (anime as any).imageUrl,
                      description: '' 
                    }} 
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}