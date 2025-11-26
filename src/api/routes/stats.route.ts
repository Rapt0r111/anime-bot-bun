// src/api/routes/stats.route.ts

import { Elysia } from 'elysia';
import { monitoring } from '../../services/monitoring';
import { getCacheStats } from '../../services/parser';

export const statsRoute = new Elysia().get('/stats', async () => {
  const systemStats = await monitoring.getSystemStats();
  const cacheStats = getCacheStats();

  return {
    uptime: monitoring.getUptimeFormatted(),
    memory: systemStats.memory,
    database: systemStats.database,
    worker: systemStats.worker,
    cache: cacheStats,
    timestamp: new Date().toISOString(),
  };
});