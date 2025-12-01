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
  const PORT = parseInt(process.env.PORT || '8080', 10); // ✅ Слушаем 8080
  
  const app = new Elysia()
    .use(cors({
      origin: [
        'http://rapt0rs.duckdns.org',
        'https://rapt0rs.duckdns.org',
        'http://localhost:5173'
      ],
      credentials: true
    }))
    .use(healthRoute)
    .use(statsRoute)
    .use(adminRoute)
    .use(webappRoute)
    .get('/*', async ({ request, set }) => {
      if (process.env.NODE_ENV === 'production') {
        const url = new URL(request.url);
        const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
        
        try {
          const file = Bun.file(`./webapp/dist${filePath}`);
          
          if (await file.exists()) {
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
          
          set.headers['Content-Type'] = 'text/html';
          return Bun.file('./webapp/dist/index.html');
          
        } catch (error) {
          logger.error('[API] Static file error:', error);
          set.status = 404;
          return 'Not found';
        }
      }
      
      set.status = 404;
      return 'Not found';
    })
    .listen(PORT); // ✅ Используем переменную PORT

  logger.log(`[API] Server running on port ${PORT}`);
  logger.log(`[API] WebApp API endpoints available at /api/*`);

  return app;
}