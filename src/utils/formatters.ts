// src/utils/formatters.ts

/**
 * Экранирование HTML
 */
export function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  /**
   * Обрезать текст до максимальной длины
   */
  export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  }
  
  /**
   * Обрезать текст с добавлением многоточия
   */
  export function truncateWithEllipsis(text: string, maxLength: number): string {
    if (maxLength <= 0) return '';
    if (text.length <= maxLength) return text;
    if (maxLength === 1) return '…';
    return `${text.slice(0, maxLength - 1)}…`;
  }
  
  /**
   * Форматировать байты в MB
   */
  export function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
  }
  
  /**
   * Форматировать скорость
   */
  export function formatSpeed(bytesPerSecond: number): string {
    const mbps = bytesPerSecond / 1024 / 1024;
    return mbps >= 1
      ? `${mbps.toFixed(1)} MB/s`
      : `${(mbps * 1024).toFixed(0)} KB/s`;
  }
  
  /**
   * Рисовать прогресс-бар
   */
  export function drawProgressBar(percent: number, width: number = 10): string {
    const filled = Math.round(width * (percent / 100));
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }