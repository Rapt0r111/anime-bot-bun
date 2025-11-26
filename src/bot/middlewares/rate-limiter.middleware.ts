// src/bot/middlewares/rate-limiter.middleware.ts
import type { BotContext } from '../../types';
import { RATE_LIMITS } from '../../config/constants';

const userRequests = new Map<number, { count: number; resetAt: number }>();

export async function rateLimiterMiddleware(ctx: BotContext, next: () => Promise<void>) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const userLimit = userRequests.get(userId);

  if (userLimit) {
    if (now < userLimit.resetAt) {
      if (userLimit.count >= RATE_LIMITS.USER_REQUESTS_PER_MINUTE) {
        await ctx.reply('⏱ Слишком много запросов. Подождите немного.');
        return;
      }
      userLimit.count++;
    } else {
      userRequests.set(userId, { count: 1, resetAt: now + 60000 });
    }
  } else {
    userRequests.set(userId, { count: 1, resetAt: now + 60000 });
  }

  return next();
}

// Cleanup old entries
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of userRequests.entries()) {
    if (now > data.resetAt) userRequests.delete(userId);
  }
}, 60000);