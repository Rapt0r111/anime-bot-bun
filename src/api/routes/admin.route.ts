// src/api/routes/admin.route.ts

import { Elysia } from 'elysia';
import { episodeRepository } from '../../db/repositories/episode.repository';

export const adminRoute = new Elysia().post('/admin/cleanup', async ({ headers }) => {
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || headers['x-admin-token'] !== adminToken) {
    return { error: 'Unauthorized' };
  }

  const cleaned = await episodeRepository.cleanupOldCache(30);
  return { success: true, cleaned };
});