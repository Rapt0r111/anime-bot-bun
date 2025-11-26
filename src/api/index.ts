// src/api/index.ts

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { healthRoute } from './routes/health.route';
import { statsRoute } from './routes/stats.route';
import { adminRoute } from './routes/admin.route';
import { webappRoute } from './routes/webapp.route';
import { logger } from '../utils/logger';

/**
 * Запуск API сервера с поддержкой WebApp
 */
export function startApiServer() {
  const app = new Elysia()
    // CORS для WebApp
    .use(
      cors({
        origin: process.env.NODE_ENV === 'production'
          ? ['https://your-webapp-domain.com']
          : true,
        credentials: true
      })
    )
    // Routes
    .use(healthRoute)
    .use(statsRoute)
    .use(adminRoute)
    .use(webappRoute)
    // Static files для WebApp (в production)
    .get('/*', ({ set }) => {
      if (process.env.NODE_ENV === 'production') {
        // Serve webapp build
        set.headers['Content-Type'] = 'text/html';
        return Bun.file('./webapp/dist/index.html');
      }
    })
    .listen(3000);

  logger.log(`[API] Server running on port ${app.server?.port}`);
  logger.log(`[API] WebApp API endpoints available at /api/*`);

  return app;
}