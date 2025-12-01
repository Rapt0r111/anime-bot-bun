import { motion } from 'framer-motion';
import { X, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useHapticFeedback, useMainButton } from '@telegram-apps/sdk-react';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useDownloadStore } from '../store/downloadStore';

interface Props {
  episode: { name: string; id: string };
  animeName: string;
  pageUrl: string;
  onClose: () => void;
}

export default function DownloadModal({ episode, animeName, pageUrl, onClose }: Props) {
  const haptic = useHapticFeedback();
  const mainButton = useMainButton();
  const addDownload = useDownloadStore(state => state.addDownload);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');

  // ✅ ИСПРАВЛЕНИЕ: Используем useMutation с правильными зависимостями
  const { mutate: startDownload } = useMutation({
    mutationFn: () => api.downloadEpisode(pageUrl, episode.id, episode.name, animeName),
    
    onMutate: () => {
      setStatus('downloading');
      haptic?.notificationOccurred('success');
      
      addDownload({
        id: Date.now().toString(),
        animeName,
        episodeName: episode.name,
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      });
    },
    
    onSuccess: () => {
      setStatus('success');
      haptic?.notificationOccurred('success');
      
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    
    onError: (error) => {
      setStatus('error');
      haptic?.notificationOccurred('error');
      console.error('[DownloadModal] Error:', error);
    }
  });

  // ✅ ИСПРАВЛЕНИЕ: Мемоизируем callback для стабильности
  const handleDownloadClick = useCallback(() => {
    if (status === 'idle') {
      startDownload();
    }
  }, [status, startDownload]);

  // ✅ ИСПРАВЛЕНИЕ: Правильные зависимости useEffect
  useEffect(() => {
    if (!mainButton) return;

    if (status === 'idle') {
      mainButton.setText('Download');
      mainButton.show();
      mainButton.enable();
      
      // Используем on/off вместо onClick для избежания утечек памяти
      mainButton.on('click', handleDownloadClick);
      
      return () => {
        mainButton.off('click', handleDownloadClick);
        mainButton.hide();
      };
    } else {
      mainButton.hide();
    }
  }, [mainButton, status, handleDownloadClick]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-lg bg-slate-900 rounded-t-3xl border-t border-purple-500/30 overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-6 pb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            {status === 'idle' && <Download className="w-8 h-8 text-white" />}
            {status === 'downloading' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
            {status === 'success' && <CheckCircle className="w-8 h-8 text-white" />}
            {status === 'error' && <AlertCircle className="w-8 h-8 text-white" />}
          </div>

          <h3 className="text-xl font-bold text-white text-center mb-2">
            {animeName}
          </h3>
          
          <p className="text-purple-300 text-center text-sm mb-6">
            {episode.name}
          </p>

          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {status === 'idle' && (
              <p className="text-gray-400 text-sm">
                Ready to download in 1080p quality
              </p>
            )}
            
            {status === 'downloading' && (
              <div className="space-y-2">
                <p className="text-purple-300 text-sm">Processing...</p>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            )}
            
            {status === 'success' && (
              <p className="text-green-400 text-sm font-medium">
                ✅ Download started successfully!
              </p>
            )}
            
            {status === 'error' && (
              <p className="text-red-400 text-sm">
                ❌ Failed to download. Try again.
              </p>
            )}
          </motion.div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="px-3 py-1 bg-purple-600/20 rounded-full text-purple-300 text-xs font-medium">
              1080p HD
            </div>
            <div className="px-3 py-1 bg-green-600/20 rounded-full text-green-300 text-xs font-medium">
              Free
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}