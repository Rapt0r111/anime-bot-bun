// src/services/monitoring.ts

import { episodeRepository } from '../db/repositories/episode.repository';
import { subscriberRepository } from '../db/repositories/subscriber.repository';
import { logger } from '../utils/logger';

interface SystemStats {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  database: {
    totalEpisodes: number;
    cachedEpisodes: number;
    processingEpisodes: number;
    failedEpisodes: number;
    totalSubscribers: number;
    cacheHitRate: number;
    avgFileSize: number;
    totalCacheSize: number;
  };
  worker: {
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
  };
  performance: {
    avgDownloadTime: number;
    avgUploadTime: number;
    successRate: number;
  };
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
}

class MonitoringService {
  private startTime: number;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private downloadTimes: number[] = [];
  private uploadTimes: number[] = [];
  private completedJobs: number = 0;
  private failedJobs: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  // ==================== CACHE METRICS ====================
  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  // ==================== PERFORMANCE METRICS ====================
  recordDownloadTime(ms: number): void {
    this.downloadTimes.push(ms);
    // Храним только последние 100 записей
    if (this.downloadTimes.length > 100) {
      this.downloadTimes.shift();
    }
  }

  recordUploadTime(ms: number): void {
    this.uploadTimes.push(ms);
    if (this.uploadTimes.length > 100) {
      this.uploadTimes.shift();
    }
  }

  recordJobCompletion(success: boolean): void {
    if (success) {
      this.completedJobs++;
    } else {
      this.failedJobs++;
    }
  }

  getAvgDownloadTime(): number {
    if (this.downloadTimes.length === 0) return 0;
    return Math.round(
      this.downloadTimes.reduce((a, b) => a + b, 0) / this.downloadTimes.length
    );
  }

  getAvgUploadTime(): number {
    if (this.uploadTimes.length === 0) return 0;
    return Math.round(
      this.uploadTimes.reduce((a, b) => a + b, 0) / this.uploadTimes.length
    );
  }

  getSuccessRate(): number {
    const total = this.completedJobs + this.failedJobs;
    return total > 0 ? (this.completedJobs / total) * 100 : 0;
  }

  // ==================== SYSTEM STATS ====================
  async getSystemStats(): Promise<SystemStats> {
    const memUsage = process.memoryUsage();

    // Database stats
    const dbStats = await episodeRepository.getStats();
    const subCount = await subscriberRepository.getCount();
    const cacheHitRate = this.getCacheHitRate();

    // Вычисляем средний размер файла и общий размер кэша
    const avgFileSize = dbStats?.cached 
      ? Math.round((dbStats.total || 0) / (dbStats.cached || 1))
      : 0;
    
    const totalCacheSize = avgFileSize * (dbStats?.cached || 0);

    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      database: {
        totalEpisodes: dbStats?.total || 0,
        cachedEpisodes: dbStats?.cached || 0,
        processingEpisodes: dbStats?.processing || 0,
        failedEpisodes: dbStats?.failed || 0,
        totalSubscribers: subCount || 0,
        cacheHitRate: Math.round(cacheHitRate),
        avgFileSize,
        totalCacheSize,
      },
      worker: {
        activeJobs: dbStats?.processing || 0,
        completedJobs: this.completedJobs,
        failedJobs: this.failedJobs,
      },
      performance: {
        avgDownloadTime: this.getAvgDownloadTime(),
        avgUploadTime: this.getAvgUploadTime(),
        successRate: Math.round(this.getSuccessRate()),
      },
    };
  }

  // ==================== HEALTH CHECKS ====================
  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database check
    try {
      const start = Date.now();
      await episodeRepository.getStats();
      checks.push({
        name: 'database',
        status: 'healthy',
        latency: Date.now() - start,
      });
    } catch (err) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.push({
      name: 'memory',
      status: memPercent < 90 ? 'healthy' : memPercent < 95 ? 'degraded' : 'unhealthy',
      message: `${memPercent.toFixed(1)}% used`,
    });

    // Disk space check (опционально, требует дополнительной библиотеки)
    // TODO: Добавить проверку места на диске

    return checks;
  }

  // ==================== UTILITIES ====================
  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  resetPerformanceStats(): void {
    this.downloadTimes = [];
    this.uploadTimes = [];
    this.completedJobs = 0;
    this.failedJobs = 0;
  }

  getUptimeFormatted(): string {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  getMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const memUsage = process.memoryUsage();
    const percent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (percent < 70) return 'low';
    if (percent < 85) return 'medium';
    if (percent < 95) return 'high';
    return 'critical';
  }
}

export const monitoring = new MonitoringService();

/**
 * Health check с детальной информацией
 */
export async function getHealthStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  stats?: SystemStats;
}> {
  try {
    const checks = await monitoring.performHealthChecks();
    
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const totalCount = checks.length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyCount === 0) {
      status = 'unhealthy';
    } else if (healthyCount < totalCount) {
      status = 'degraded';
    }

    const stats = await monitoring.getSystemStats();

    return { status, checks, stats };
  } catch (err) {
    logger.error('[Health] Check failed:', err);
    return {
      status: 'unhealthy',
      checks: [
        {
          name: 'health_check',
          status: 'unhealthy',
          message: 'Health check system error',
        },
      ],
    };
  }
}

/**
 * Автоматическая очистка с умной стратегией
 */
export async function performSmartCleanup(): Promise<{
  cleaned: number;
  freedSpace: number;
}> {
  try {
    const stats = await episodeRepository.getStats();
    const memPressure = monitoring.getMemoryPressure();

    // Определяем возраст файлов для удаления в зависимости от давления памяти
    let daysOld = 30; // По умолчанию
    
    if (memPressure === 'critical') {
      daysOld = 7; // Агрессивная очистка
    } else if (memPressure === 'high') {
      daysOld = 14;
    } else if (memPressure === 'medium') {
      daysOld = 21;
    }

    // Если кэш переполнен, уменьшаем возраст
    const cacheFullness = (stats?.cached || 0) / Math.max(stats?.total || 1, 1);
    if (cacheFullness > 0.8) {
      daysOld = Math.min(daysOld, 14);
    }

    logger.log(`[Cleanup] Starting cleanup (age: ${daysOld} days, pressure: ${memPressure})`);

    const cleaned = await episodeRepository.cleanupOldCache(daysOld);
    
    // Примерная оценка освобожденного места
    const avgFileSize = 100 * 1024 * 1024; // 100 MB средний размер
    const freedSpace = cleaned * avgFileSize;

    logger.log(`[Cleanup] Completed: ${cleaned} entries removed, ~${(freedSpace / 1024 / 1024 / 1024).toFixed(2)} GB freed`);

    return { cleaned, freedSpace };
  } catch (err) {
    logger.error('[Cleanup] Failed:', err);
    throw err;
  }
}

/**
 * Запуск планировщика очистки с адаптивным интервалом
 */
export function startCleanupScheduler(intervalHours: number = 24): NodeJS.Timeout {
  const interval = intervalHours * 60 * 60 * 1000;

  logger.log(`[Monitoring] Starting cleanup scheduler (every ${intervalHours}h)`);

  return setInterval(async () => {
    try {
      const { cleaned, freedSpace } = await performSmartCleanup();
      
      if (cleaned > 0) {
        logger.log(
          `[Monitoring] Cleanup: ${cleaned} entries, ` +
          `${(freedSpace / 1024 / 1024 / 1024).toFixed(2)} GB freed`
        );
      }
    } catch (err) {
      logger.error('[Monitoring] Cleanup failed:', err);
    }
  }, interval);
}

/**
 * Периодическое логирование статистики
 */
export function startStatsLogger(intervalMinutes: number = 10): NodeJS.Timeout {
  const interval = intervalMinutes * 60 * 1000;

  return setInterval(async () => {
    try {
      const stats = await monitoring.getSystemStats();
      logger.log('[Stats] System:', {
        uptime: monitoring.getUptimeFormatted(),
        memory: `${stats.memory.percentage}%`,
        cache: `${stats.database.cacheHitRate}%`,
        success: `${stats.performance.successRate}%`,
        jobs: `${stats.worker.completedJobs}/${stats.worker.failedJobs}`,
      });
    } catch (err) {
      logger.error('[Stats] Logger failed:', err);
    }
  }, interval);
}