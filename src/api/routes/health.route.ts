// src/api/routes/health.route.ts

import { Elysia } from 'elysia';
import { getHealthStatus } from '../../services/monitoring';

export const healthRoute = new Elysia().get('/health', async () => {
  const health = await getHealthStatus();
  
  return {
    status: health.status,
    checks: health.checks,
    timestamp: new Date().toISOString(),
  };
});