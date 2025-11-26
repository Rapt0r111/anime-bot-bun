// src/api/index.ts

import { Elysia } from 'elysia';
import { healthRoute } from './routes/health.route';
import { statsRoute } from './routes/stats.route';
import { adminRoute } from './routes/admin.route';
import { logger } from '../utils/logger';

/**
 * Запуск API сервера
 */
export function startApiServer() {
  const app = new Elysia()
    .use(healthRoute)
    .use(statsRoute)
    .use(adminRoute)
    .listen(3000);

  logger.log(`[API] Server running on port ${app.server?.port}`);

  return app;
}