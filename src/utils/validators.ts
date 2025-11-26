// src/utils/validators.ts

/**
 * Проверить валидность URL
 */
export function isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
  
  /**
   * Проверить валидность Telegram file ID
   */
  export function isValidFileId(fileId: string): boolean {
    return typeof fileId === 'string' && fileId.length > 0 && fileId.length < 200;
  }
  
  /**
   * Проверить валидность chat ID
   */
  export function isValidChatId(chatId: number): boolean {
    return Number.isInteger(chatId) && Math.abs(chatId) > 0;
  }
  
  /**
   * Проверить валидность номера страницы
   */
  export function isValidPageNumber(page: number, totalPages: number): boolean {
    return Number.isInteger(page) && page >= 0 && page < totalPages;
  }
  
  /**
   * Проверить валидность поискового запроса
   */
  export function isValidSearchQuery(query: string): boolean {
    if (typeof query !== 'string') return false;
    const trimmed = query.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
  }
  
  /**
   * Проверить валидность video ID
   */
  export function isValidVideoId(videoId: string): boolean {
    return (
      typeof videoId === 'string' &&
      videoId.length > 0 &&
      /^[a-zA-Z0-9_-]+$/.test(videoId)
    );
  }
  
  /**
   * Проверить валидность имени файла
   */
  export function isValidFilename(filename: string): boolean {
    if (typeof filename !== 'string' || filename.length === 0) return false;
  
    // Проверка на опасные символы
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) return false;
  
    // Проверка на относительные пути
    if (filename.includes('..') || filename.includes('./')) return false;
  
    return true;
  }
  
  /**
   * Проверить размер файла
   */
  export function isValidFileSize(size: number, maxSize: number = 2147483648): boolean {
    return Number.isInteger(size) && size > 0 && size <= maxSize;
  }
  
  /**
   * Санитизировать имя файла
   */
  export function sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"|?*\x00-\x1f]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/\.\//g, '_')
      .trim()
      .substring(0, 200);
  }
  
  /**
   * Валидировать episode number
   */
  export function isValidEpisodeNumber(num: number): boolean {
    return Number.isInteger(num) && num >= 0 && num <= 9999;
  }
  
  /**
   * Проверить валидность качества видео
   */
  export function isValidQuality(quality: string): boolean {
    const validQualities = ['1080p', '720p', '480p', 'SD', 'HD', 'FHD'];
    return validQualities.some(q => quality.includes(q));
  }