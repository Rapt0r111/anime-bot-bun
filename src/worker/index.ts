// src/worker/index.ts

import { Worker } from 'bullmq';
import type { VideoJobData } from '../types';
import { processVideoJob } from './processors/video-processor';
import { metrics } from './utils/metrics';
import { logger } from '../utils/logger';
import { WORKER_CONFIG } from '../config/constants';

/**
 * Создание и настройка worker
 */
const worker = new Worker<VideoJobData>('anime-processing', processVideoJob, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  concurrency: WORKER_CONFIG.CONCURRENCY,
  limiter: WORKER_CONFIG.RATE_LIMIT,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      return Math.min(1000 * Math.pow(2, attemptsMade), 60000);
    },
  },
});

// ==================== EVENTS ====================
worker.on('completed', (job) => {
  logger.log(`[Worker] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  logger.error('[Worker] ⚠️ Error:', err);
});

// ==================== GRACEFUL SHUTDOWN ====================
async function shutdown() {
  logger.log('[Worker] Shutting down...');
  await worker.close();
  const stats = metrics.getStats();
  logger.log('[Worker] Final stats:', JSON.stringify(stats, null, 2));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ==================== START ====================
metrics.startPeriodicLogging();

logger.log('[Worker] 🚀 Started');
logger.log(
  `[Worker] Concurrency: ${WORKER_CONFIG.CONCURRENCY}, Rate: ${WORKER_CONFIG.RATE_LIMIT.max}/min`
);

export { worker, metrics };