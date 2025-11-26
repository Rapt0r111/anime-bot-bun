// src/bot/ui/messages.ts

import type { AnimeCard, AnimePageData } from '../../services/parser';
import { TEXT_LIMITS } from '../../config/constants';
import { escapeHtml, truncateText, truncateWithEllipsis } from '../../utils/formatters';

/**
 * Приветственное сообщение
 */
export function buildWelcomeMessage(): string {
  return (
    `👋 <b>Привет!</b>\n` +
    `Я могу скачивать аниме с Animevost в 1080p.\n\n` +
    `👇 Выберите действие:`
  );
}

/**
 * Сообщение-инструкция по поиску
 */
export function buildSearchInstructionMessage(): string {
  return (
    `🔎 <b>Поиск аниме</b>\n\n` +
    `Просто отправьте мне название аниме, например:\n` +
    `• naruto\n` +
    `• one piece\n` +
    `• тетрадь смерти\n\n` +
    `Я покажу список найденных релизов, и вы сможете выбрать нужную серию.`
  );
}

/**
 * Caption для страницы аниме
 */
export function buildAnimeCaption(anime: AnimePageData): string {
  const title = truncateText(anime.name, TEXT_LIMITS.MAX_TITLE);
  const meta = anime.meta ? truncateText(anime.meta, 120) : undefined;
  const description = (anime.description || 'Описание отсутствует.').trim();

  const composeCaption = (desc: string): string =>
    `🎬 <b>${title}</b>\n` +
    (meta ? `<i>${meta}</i>\n` : '') +
    `\n<blockquote expandable>${desc}</blockquote>\n\n` +
    `👇 <b>Выберите серию:</b>`;

  const extraLength = composeCaption('').length;
  const availableForDescription = Math.max(
    0,
    TEXT_LIMITS.TELEGRAM_CAPTION - extraLength
  );
  const safeDescription = truncateWithEllipsis(description, availableForDescription);

  return composeCaption(safeDescription);
}

/**
 * Caption для нового релиза
 */
export function buildReleaseCaption(card: AnimeCard): string {
  const title = escapeHtml(card.title);
  const rawDescription = card.description ? card.description.trim() : '';
  const description = rawDescription
    ? escapeHtml(
        truncateWithEllipsis(rawDescription, TEXT_LIMITS.MAX_RELEASE_DESCRIPTION)
      )
    : '';

  return (
    `🆕 <b>Новая серия!</b>\n\n` +
    `🎬 <b>${title}</b>\n` +
    (description ? `\n${description}\n` : '') +
    `\n👇 Нажмите кнопку, чтобы перейти к аниме.`
  );
}

/**
 * Caption для результатов поиска
 */
export function buildSearchResultsCaption(query: string, count: number): string {
  return (
    `🔎 <b>Результаты поиска:</b> "${query}"\n\n` +
    `Найдено: ${count}`
  );
}

/**
 * Caption для списка последних
 */
export function buildLatestListCaption(): string {
  return (
    `🔥 <b>Последние обновления:</b>\n\n` +
    `Выберите аниме из списка ниже, чтобы скачать серию:`
  );
}

/**
 * Сообщение статистики
 */
export function buildStatsMessage(stats: {
  uptime: string;
  memory: { used: number; total: number; percentage: number };
  database: {
    totalEpisodes: number;
    cachedEpisodes: number;
    processingEpisodes: number;
    failedEpisodes: number;
    totalSubscribers: number;
    cacheHitRate: number;
  };
}): string {
  return (
    `📊 <b>Статистика бота</b>\n\n` +
    `⏱ Uptime: ${stats.uptime}\n` +
    `💾 Память: ${stats.memory.used}/${stats.memory.total} MB (${stats.memory.percentage}%)\n\n` +
    `<b>База данных:</b>\n` +
    `• Всего эпизодов: ${stats.database.totalEpisodes}\n` +
    `• В кэше: ${stats.database.cachedEpisodes}\n` +
    `• Обрабатывается: ${stats.database.processingEpisodes}\n` +
    `• Ошибок: ${stats.database.failedEpisodes}\n` +
    `• Cache hit rate: ${stats.database.cacheHitRate}%\n\n` +
    `👥 Подписчиков: ${stats.database.totalSubscribers}`
  );
}

/**
 * Сообщение топа аниме
 */
export function buildTopAnimeMessage(
  top: Array<{ name: string; views: number; episodes: number }>
): string {
  if (top.length === 0) {
    return '📊 Статистика пока недоступна.';
  }

  return (
    `🏆 <b>Топ 10 аниме:</b>\n\n` +
    top
      .map(
        (anime, index) =>
          `${index + 1}. ${anime.name}\n` +
          `   • Просмотров: ${anime.views}\n` +
          `   • Эпизодов: ${anime.episodes}`
      )
      .join('\n\n')
  );
}