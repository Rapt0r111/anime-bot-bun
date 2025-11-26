// src/types/callback.ts

/**
 * Типы действий для callback_query
 */
export type CallbackAction =
  | 'select'          // Выбор аниме (из поиска)
  | 'select_latest'   // Выбор аниме (из топ-10)
  | 'dl'              // Скачивание эпизода
  | 'cancel'          // Отмена/закрытие
  | 'latest_list'     // Показать список последних
  | 'start_search'    // Начать поиск
  | 'noop';           // Нет действия (пагинация)

/**
 * Базовый интерфейс для разобранного callback
 */
export interface ParsedCallback {
  action: CallbackAction;
  params: string[];
}

/**
 * Callback для выбора аниме
 * Формат: select|{shortId}|{page}
 * Формат (latest): select_latest|{shortId}|{animeIndex}|{page}
 */
export interface SelectCallbackData {
  action: 'select' | 'select_latest';
  shortId: string;
  animeIndex?: number;
  page: number;
}

/**
 * Callback для скачивания
 * Формат: dl|{shortId}
 */
export interface DownloadCallbackData {
  action: 'dl';
  shortId: string;
}

/**
 * Callback для отмены
 * Формат: cancel
 */
export interface CancelCallbackData {
  action: 'cancel';
}

/**
 * Callback для списка последних
 * Формат: latest_list
 */
export interface LatestListCallbackData {
  action: 'latest_list';
}

/**
 * Callback для начала поиска
 * Формат: start_search
 */
export interface StartSearchCallbackData {
  action: 'start_search';
}

/**
 * Callback без действия (для пагинации)
 * Формат: noop
 */
export interface NoopCallbackData {
  action: 'noop';
}

/**
 * Объединенный тип для всех callback данных
 */
export type CallbackData =
  | SelectCallbackData
  | DownloadCallbackData
  | CancelCallbackData
  | LatestListCallbackData
  | StartSearchCallbackData
  | NoopCallbackData;

/**
 * Парсер callback данных
 */
export function parseCallbackData(data: string): ParsedCallback {
  const parts = data.split('|');
  const action = parts[0] as CallbackAction;
  const params = parts.slice(1);

  return { action, params };
}

/**
 * Билдер callback данных для select
 */
export function buildSelectCallback(
  shortId: string,
  page: number,
  animeIndex?: number
): string {
  if (animeIndex !== undefined) {
    return `select_latest|${shortId}|${animeIndex}|${page}`;
  }
  return `select|${shortId}|${page}`;
}

/**
 * Билдер callback данных для download
 */
export function buildDownloadCallback(shortId: string): string {
  return `dl|${shortId}`;
}