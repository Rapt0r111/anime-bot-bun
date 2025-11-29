import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { healthRoute } from './routes/health.route';
import { statsRoute } from './routes/stats.route';
import { adminRoute } from './routes/admin.route';
import { webappRoute } from './routes/webapp.route';
import { logger } from '../utils/logger';
import { staticPlugin } from '@elysiajs/static';

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
    // API Routes (должны быть ПЕРЕД статикой)
    .use(healthRoute)
    .use(statsRoute)
    .use(adminRoute)
    .use(webappRoute)
    // Static files для WebApp (в production)
    .get('/*', async ({ request, set }) => {
      if (process.env.NODE_ENV === 'production') {
        const url = new URL(request.url);
        const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
        
        try {
          // Пробуем открыть файл из webapp/dist
          const file = Bun.file(`./webapp/dist${filePath}`);
          
          if (await file.exists()) {
            // Устанавливаем правильный Content-Type
            const ext = filePath.split('.').pop();
            const contentTypes: Record<string, string> = {
              'html': 'text/html',
              'js': 'application/javascript',
              'css': 'text/css',
              'json': 'application/json',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'svg': 'image/svg+xml',
              'ico': 'image/x-icon',
              'woff': 'font/woff',
              'woff2': 'font/woff2'
            };
            
            set.headers['Content-Type'] = contentTypes[ext || 'html'] || 'application/octet-stream';
            return file;
          }
          
          // Если файл не найден, отдаём index.html (для SPA routing)
          set.headers['Content-Type'] = 'text/html';
          return Bun.file('./webapp/dist/index.html');
          
        } catch (error) {
          logger.error('[API] Static file error:', error);
          set.status = 404;
          return 'Not found';
        }
      }
      
      // В dev режиме ничего не отдаём (Vite dev server работает отдельно)
      set.status = 404;
      return 'Not found';
    })
    .listen(3000);

  logger.log(`[API] Server running on port ${app.server?.port}`);
  logger.log(`[API] WebApp API endpoints available at /api/*`);

  return app;
}