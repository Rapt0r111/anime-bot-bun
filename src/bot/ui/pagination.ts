// src/bot/ui/pagination.ts

import { PAGINATION } from '../../config/constants';

/**
 * Вычислить общее количество страниц
 */
export function calculateTotalPages(totalItems: number): number {
  return Math.ceil(totalItems / PAGINATION.ITEMS_PER_PAGE);
}

/**
 * Получить элементы для текущей страницы
 */
export function getPageItems<T>(items: T[], page: number): T[] {
  const start = page * PAGINATION.ITEMS_PER_PAGE;
  const end = start + PAGINATION.ITEMS_PER_PAGE;
  return items.slice(start, end);
}

/**
 * Проверить валидность номера страницы
 */
export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 0 && page < totalPages;
}

/**
 * Получить диапазон страниц для отображения
 */
export function getPageRange(
  currentPage: number,
  totalPages: number,
  maxButtons: number = 5
): number[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const half = Math.floor(maxButtons / 2);
  let start = currentPage - half;
  let end = currentPage + half;

  if (start < 0) {
    start = 0;
    end = maxButtons - 1;
  }

  if (end >= totalPages) {
    end = totalPages - 1;
    start = totalPages - maxButtons;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}