import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex, index, bigint } from 'drizzle-orm/pg-core';

export const episodes = pgTable('episodes', {
  id: serial('id').primaryKey(),
  
  // Основные метаданные
  animeName: text('anime_name').notNull(),
  episodeNumber: integer('episode_number').default(0).notNull(),
  
  // УНИКАЛЬНЫЙ ID С САЙТА
  sourceVideoId: text('source_video_id').notNull(),
  
  // Ссылки
  pageUrl: text('page_url').notNull(),
  videoUrl: text('video_url'),
  
  // КЭШ TELEGRAM
  telegramFileId: text('telegram_file_id'),
  fileSize: integer('file_size'), // Размер файла в байтах
  quality: text('quality'), // 1080p, 720p, SD
  
  // Статусы
  isProcessing: boolean('is_processing').default(false).notNull(),
  hasError: boolean('has_error').default(false).notNull(),
  errorMessage: text('error_message'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at'), // Для TTL кэша
  
  // Метрики использования
  accessCount: integer('access_count').default(0).notNull(),
}, (t) => ({
  // Основной уникальный индекс
  uniqueSourceId: uniqueIndex('unique_source_id_idx').on(t.sourceVideoId),
  
  // Индексы для быстрого поиска
  telegramFileIdIdx: index('telegram_file_id_idx').on(t.telegramFileId),
  animeNameIdx: index('anime_name_idx').on(t.animeName),
  isProcessingIdx: index('is_processing_idx').on(t.isProcessing),
  
  // Композитный индекс для кэша
  cacheIdx: index('cache_idx').on(t.telegramFileId, t.lastAccessedAt),
}));

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  username: text('username'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  languageCode: text('language_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqueChatId: uniqueIndex('subscribers_chat_id_idx').on(t.chatId),
}));

export const releaseNotifications = pgTable('release_notifications', {
  id: serial('id').primaryKey(),
  releaseId: text('release_id').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  imageUrl: text('image_url'),
  description: text('description'),
  notifiedAt: timestamp('notified_at').defaultNow().notNull(),
}, (t) => ({
  uniqueReleaseId: uniqueIndex('release_notifications_release_id_idx').on(t.releaseId),
}));

// Новая таблица для статистики
export const animeStats = pgTable('anime_stats', {
  id: serial('id').primaryKey(),
  animeName: text('anime_name').notNull().unique(),
  totalViews: integer('total_views').default(0).notNull(),
  totalDownloads: integer('total_downloads').default(0).notNull(),
  lastViewed: timestamp('last_viewed').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Таблица для управления кэшем
export const cacheMetadata = pgTable('cache_metadata', {
  id: serial('id').primaryKey(),
  totalSize: integer('total_size').default(0).notNull(), // Общий размер кэша
  maxSize: integer('max_size').default(10737418240).notNull(), // 10GB
  lastCleanup: timestamp('last_cleanup').defaultNow().notNull(),
});