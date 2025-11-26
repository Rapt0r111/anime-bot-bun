// src/types/job.ts

/**
 * Данные для задачи обработки видео
 */
export interface VideoJobData {
    /** ID записи в БД */
    recordId: number;
  
    /** URL страницы с аниме */
    pageUrl: string;
  
    /** ID пользователя, запросившего скачивание */
    userId: number;
  
    /** ID чата для отправки результата (опционально, по умолчанию = userId) */
    chatId?: number;
  
    /** Принудительный ID видео (для выбора конкретного эпизода) */
    forcedVideoId?: string;
  
    /** Название эпизода */
    epName: string;
  
    /** Ключ для кнопки "Назад" */
    backKey?: string;
  
    /** ID сообщения со статусом */
    startMsgId?: number;
  }
  
  /**
   * Результат обработки задачи
   */
  export interface JobResult {
    success: boolean;
    recordId: number;
    telegramFileId?: string;
    fileSize?: number;
    quality?: string;
    error?: string;
  }
  
  /**
   * Метаданные задачи для мониторинга
   */
  export interface JobMetadata {
    jobId: string | number;
    recordId: number;
    epName: string;
    userId: number;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }
  
  /**
   * Опции для создания задачи
   */
  export interface CreateJobOptions {
    /** Приоритет задачи (чем выше, тем приоритетнее) */
    priority?: number;
  
    /** Задержка перед выполнением (мс) */
    delay?: number;
  
    /** Максимальное количество попыток */
    attempts?: number;
  
    /** Стратегия backoff для повторных попыток */
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
  
    /** Удалить задачу после завершения */
    removeOnComplete?: boolean;
  
    /** Удалить задачу после ошибки */
    removeOnFail?: boolean;
  }