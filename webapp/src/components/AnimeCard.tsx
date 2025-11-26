import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { AnimeCard as AnimeCardType } from '../types';

interface Props {
  anime: AnimeCardType;
}

export default function AnimeCard({ anime }: Props) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const animeId = btoa(anime.url); // Base64 encode URL as ID
    navigate(`/anime/${animeId}`);
  };

  return (
    <motion.div
      className="group relative cursor-pointer"
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-800">
        <img
          src={anime.imageUrl}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Play Button */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
          initial={false}
          animate={{ scale: [0.8, 1] }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-16 h-16 rounded-full bg-purple-600/90 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </motion.div>

        {/* Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600/90 backdrop-blur-sm rounded-lg text-xs font-bold text-white">
          HD
        </div>
      </div>

      {/* Title */}
      <motion.h3 
        className="mt-2 text-sm font-medium text-white line-clamp-2 px-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {anime.title}
      </motion.h3>
    </motion.div>
  );
}