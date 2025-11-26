// src/worker/utils/metrics.ts

import { logger } from '../../utils/logger';
import { WORKER_CONFIG } from '../../config/constants';

interface MetricsStats {
  totalJobs: number;
  successJobs: number;
  failedJobs: number;
  totalDownloadTime: number;
  totalUploadTime: number;
  totalBytes: number;
  retries: number;
}

/**
 * Класс для сбора метрик worker
 */
export class WorkerMetrics {
  private stats: MetricsStats = {
    totalJobs: 0,
    successJobs: 0,
    failedJobs: 0,
    totalDownloadTime: 0,
    totalUploadTime: 0,
    totalBytes: 0,
    retries: 0,
  };

  recordDownload(timeMs: number, bytes: number): void {
    this.stats.totalDownloadTime += timeMs;
    this.stats.totalBytes += bytes;
  }

  recordUpload(timeMs: number): void {
    this.stats.totalUploadTime += timeMs;
  }

  recordSuccess(): void {
    this.stats.totalJobs++;
    this.stats.successJobs++;
  }

  recordFailure(): void {
    this.stats.totalJobs++;
    this.stats.failedJobs++;
  }

  recordRetry(): void {
    this.stats.retries++;
  }

  getStats() {
    const avgDownloadTime =
      this.stats.successJobs > 0
        ? Math.round(this.stats.totalDownloadTime / this.stats.successJobs)
        : 0;

    const avgUploadTime =
      this.stats.successJobs > 0
        ? Math.round(this.stats.totalUploadTime / this.stats.successJobs)
        : 0;

    const totalGB = (this.stats.totalBytes / 1024 / 1024 / 1024).toFixed(2);

    return {
      ...this.stats,
      avgDownloadTime,
      avgUploadTime,
      totalGB,
      successRate:
        this.stats.totalJobs > 0
          ? Math.round((this.stats.successJobs / this.stats.totalJobs) * 100)
          : 0,
    };
  }

  reset(): void {
    this.stats = {
      totalJobs: 0,
      successJobs: 0,
      failedJobs: 0,
      totalDownloadTime: 0,
      totalUploadTime: 0,
      totalBytes: 0,
      retries: 0,
    };
  }

  startPeriodicLogging(): NodeJS.Timeout {
    return setInterval(() => {
      const stats = this.getStats();
      logger.log('[Metrics]', JSON.stringify(stats, null, 2));
    }, WORKER_CONFIG.METRICS_LOG_INTERVAL);
  }
}

export const metrics = new WorkerMetrics();