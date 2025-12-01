// src/bot/ui/keyboards.ts

import { InlineKeyboard } from 'grammy';
import { PAGINATION, TEXT_LIMITS } from '../../config/constants';
import { cacheService } from '../../services/cache.service';
import type { AnimeCard, AnimePageData } from '../../services/parser';
import type { PaginationParams } from '../../types';
import { truncateText } from '../../utils/formatters';

/**
 * Главное меню
 */
export function buildMainMenuKeyboard(): InlineKeyboard {
  // По умолчанию открываем 1-ю страницу
  return new InlineKeyboard()
    .text('🔥 Топ 10 Новинок', 'latest_list|1') 
    .row()
    .text('🔍 Поиск аниме', 'start_search');
}

/**
 * Клавиатура для списка последних аниме с пагинацией
 */
export function buildLatestListKeyboard(items: AnimeCard[], page: number = 1): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Выводим список (обычно парсер возвращает 10-15 элементов на страницу)
  items.forEach((anime, index) => {
    const shortId = cacheService.save(anime.url);
    const title = truncateText(anime.title, TEXT_LIMITS.MAX_TITLE);
    
    // Формат: select_latest | ID ссылки | индекс | 0 (страница серий)
    keyboard
      .text(`${index + 1}. ${title}`, `select_latest|${shortId}|${index}|0`)
      .row();
  });

  // --- Блок пагинации ---
  const navRow: { text: string; callback_data: string }[] = [];

  // Кнопка Назад
  if (page > 1) {
    navRow.push({ text: '⬅️', callback_data: `latest_list|${page - 1}` });
  }

  // Индикатор страницы
  navRow.push({ text: `Стр. ${page}`, callback_data: 'noop' });

  // Кнопка Вперед 
  // Если элементов меньше 10, скорее всего это последняя страница
  if (items.length >= 10) {
    navRow.push({ text: '➡️', callback_data: `latest_list|${page + 1}` });
  }

  if (navRow.length > 0) {
    keyboard.row(...navRow);
  }

  keyboard.text('❌ Закрыть', 'cancel');
  return keyboard;
}

/**
 * Клавиатура с кнопками эпизодов
 */
export function buildEpisodeButtons(
  series: AnimePageData['series'],
  pageUrl: string
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  let row: { text: string; callback_data: string }[] = [];

  for (const episode of series) {
    const key = cacheService.save(`${pageUrl}::${episode.id}::${episode.name}`);
    let btnText = episode.name.replace(/серия|эпизод/gi, '').trim();
    btnText = truncateText(btnText, TEXT_LIMITS.MAX_BUTTON_TEXT);

    row.push({
      text: btnText,
      callback_data: `dl|${key}`,
    });

    if (row.length === PAGINATION.BUTTONS_PER_ROW) {
      keyboard.row(...row);
      row = [];
    }
  }

  if (row.length > 0) {
    keyboard.row(...row);
  }

  return keyboard;
}

/**
 * Кнопки пагинации страниц (внутри выбора серий)
 */
export function addPaginationButtons(
  keyboard: InlineKeyboard,
  params: PaginationParams
): void {
  const { action, shortId, animeIndex, currentPage, totalPages } = params;

  if (totalPages <= 1) return;

  const row: { text: string; callback_data: string }[] = [];

  const getPageCallback = (page: number): string => {
    if (action === 'select_latest' && animeIndex !== undefined) {
      return `select_latest|${shortId}|${animeIndex}|${page}`;
    }
    return `select|${shortId}|${page}`;
  };

  if (currentPage > 0) {
    row.push({
      text: '⬅️ Назад',
      callback_data: getPageCallback(currentPage - 1),
    });
  }

  row.push({
    text: `${currentPage + 1}/${totalPages}`,
    callback_data: 'noop',
  });

  if (currentPage < totalPages - 1) {
    row.push({
      text: 'Далее ➡️',
      callback_data: getPageCallback(currentPage + 1),
    });
  }

  keyboard.row(...row);
}

/**
 * Кнопки навигации между аниме (в детальном просмотре)
 */
export function addAnimeNavigationButtons(
  keyboard: InlineKeyboard,
  animeList: AnimeCard[],
  currentIndex: number
): void {
  // Навигация работает только в рамках текущей загруженной страницы (top items)
  // Для глобальной навигации нужно усложнять логику, пока оставим локальную
  
  if (currentIndex < 0 || currentIndex >= animeList.length) return;

  const row: { text: string; callback_data: string }[] = [];

  if (currentIndex > 0) {
    const prevItem = animeList[currentIndex - 1];
    if (prevItem) {
      const prevId = cacheService.save(prevItem.url);
      row.push({
        text: '⏪ Пред.',
        callback_data: `select_latest|${prevId}|${currentIndex - 1}|0`,
      });
    }
  }

  if (currentIndex < animeList.length - 1) {
    const nextItem = animeList[currentIndex + 1];
    if (nextItem) {
      const nextId = cacheService.save(nextItem.url);
      row.push({
        text: 'След. ⏩',
        callback_data: `select_latest|${nextId}|${currentIndex + 1}|0`,
      });
    }
  }

  if (row.length > 0) {
    keyboard.row(...row);
  }
}

/**
 * Клавиатура для поиска
 */
export function buildSearchResultsKeyboard(
  results: Array<{ title: string; url: string }>
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  results.forEach((result) => {
    const shortId = cacheService.save(result.url);
    const title = truncateText(result.title, TEXT_LIMITS.MAX_SEARCH_TITLE);
    keyboard.text(title, `select|${shortId}|0`).row();
  });

  keyboard.text('❌ Закрыть', 'cancel');
  return keyboard;
}

/**
 * Кнопка "Назад"
 */
export function buildBackButton(backKey: string): InlineKeyboard {
  return new InlineKeyboard().text('🔙 Выбрать другую серию', `select|${backKey}|0`);
}

/**
 * Клавиатура для релиза
 */
export function buildReleaseKeyboard(card: AnimeCard): InlineKeyboard {
  const shortId = cacheService.save(card.url);
  return new InlineKeyboard()
    .text('▶️ Выбрать серию', `select|${shortId}|0`)
    .row()
    .url('🌐 Открыть на AnimeVost', card.url);
}