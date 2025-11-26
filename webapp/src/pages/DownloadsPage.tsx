import { motion } from 'framer-motion';
import { Download, CheckCircle, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import { useNavigate } from 'react-router-dom';

export default function DownloadsPage() {
  const downloads = useDownloadStore(state => state.downloads);
  const removeDownload = useDownloadStore(state => state.removeDownload);
  const clearCompleted = useDownloadStore(state => state.clearCompleted);
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Download className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-purple-500/20"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">Downloads</h1>
            </div>

            {downloads.length > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Clear Completed
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Downloads List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {downloads.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Download className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No downloads yet</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white font-medium transition-colors"
            >
              Browse Anime
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {downloads.map((download, index) => (
              <motion.div
                key={download.id}
                className="bg-slate-900 rounded-xl p-4 border border-purple-500/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 pt-1">
                    {getStatusIcon(download.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {download.animeName}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">
                      {download.episodeName}
                    </p>
                    
                    {/* Status */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        download.status === 'completed' ? 'text-green-400' :
                        download.status === 'processing' ? 'text-purple-400' :
                        download.status === 'failed' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {getStatusText(download.status)}
                      </span>

                      {download.status === 'processing' && (
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                            initial={{ width: '0%' }}
                            animate={{ width: `${download.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {download.error && (
                      <p className="mt-1 text-xs text-red-400">
                        {download.error}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => removeDownload(download.id)}
                    className="flex-shrink-0 p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}