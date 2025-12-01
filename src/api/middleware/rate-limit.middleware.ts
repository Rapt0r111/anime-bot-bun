// src/api/middleware/rate-limit.middleware.ts
import { Elysia } from 'elysia';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = new Elysia()
    .derive(({ headers }) => {
        const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
        return { ip };
    })
    .onBeforeHandle(({ ip, set }) => {
        const now = Date.now();
        const limit = rateLimitStore.get(ip);

        if (limit) {
            if (now < limit.resetAt) {
                if (limit.count >= 100) { // 100 requests per minute
                    set.status = 429;
                    return { error: 'Too many requests' };
                }
                limit.count++;
            } else {
                rateLimitStore.set(ip, { count: 1, resetAt: now + 60000 });
            }
        } else {
            rateLimitStore.set(ip, { count: 1, resetAt: now + 60000 });
        }
    });

// Применить:
export const webappRoute = new Elysia({ prefix: '/api/anime' })
    .use(rateLimitMiddleware)
    // Please replace the ... with your actual handler and options
    .post('/download', ({ body }) => {
        // Your download logic here
        return { success: true };
    });