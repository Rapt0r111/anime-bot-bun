// src/bot/handlers/callbacks/anime-selection.handler.ts

import type { BotContext } from '../../../types';
import { cacheService } from '../../../services/cache.service';
import { getAnimeSeries } from '../../../services/parser';
import { buildEpisodeButtons, addPaginationButtons, addAnimeNavigationButtons } from '../../ui/keyboards';
import { buildAnimeCaption } from '../../ui/messages';
import { getLatestAnime } from '../../../services/parser';
import { PAGINATION } from '../../../config/constants';
import { logger } from '../../../utils/logger';

/**
 * Обработчик выбора аниме (select / select_latest)
 */
export async function handleAnimeSelectionCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery('⚠️ Некорректные данные');
    return;
  }

  const parts = data.split('|');
  const action = parts[0] as 'select' | 'select_latest';
  const shortId = parts[1];
  const animeIndex = parts[2] ? parseInt(parts[2], 10) : undefined;
  const currentPage = parts[3] ? parseInt(parts[3], 10) : 0;

  if (!shortId) {
    await ctx.answerCallbackQuery('⚠️ Некорректные данные');
    return;
  }

  const pageUrl = cacheService.get(shortId);
  if (!pageUrl) {
    await ctx.answerCallbackQuery('⚠️ Ссылка устарела. Повторите поиск.');
    return;
  }

  await ctx.answerCallbackQuery();

  try {
    const anime = await getAnimeSeries(pageUrl);

    // Пагинация эпизодов
    const totalEpisodes = anime.series.length;
    const itemsPerPage = PAGINATION.ITEMS_PER_PAGE;
    const totalPages = Math.ceil(totalEpisodes / itemsPerPage);
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const pageEpisodes = anime.series.slice(start, end);

    // Построение клавиатуры
    const keyboard = buildEpisodeButtons(pageEpisodes, pageUrl);

    // Добавление пагинации
    addPaginationButtons(keyboard, {
      action,
      shortId,
      animeIndex,
      currentPage,
      totalPages,
    });

    // Добавление навигации между аниме (только для latest_list)
    if (action === 'select_latest' && animeIndex !== undefined) {
      const latestList = await getLatestAnime();
      addAnimeNavigationButtons(keyboard, latestList, animeIndex);
    }

    // Формирование caption
    const caption = buildAnimeCaption(anime);

    // Отправка/редактирование сообщения
    if (anime.imageUrl) {
      if (ctx.callbackQuery?.message?.photo) {
        try {
          await ctx.editMessageMedia({
            type: 'photo',
            media: anime.imageUrl,
            caption,
            parse_mode: 'HTML',
          }, {
            reply_markup: keyboard,
          });
        } catch (err) {
          logger.debug('[AnimeSelection] Failed to edit media:', err);
          await ctx.deleteMessage();
          await ctx.replyWithPhoto(anime.imageUrl, {
            caption,
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
        }
      } else {
        await ctx.deleteMessage();
        await ctx.replyWithPhoto(anime.imageUrl, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      }
    } else {
      try {
        await ctx.editMessageText(caption, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      } catch (err) {
        logger.debug('[AnimeSelection] Failed to edit text:', err);
        await ctx.deleteMessage();
        await ctx.reply(caption, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      }
    }
  } catch (err) {
    logger.error('[AnimeSelection] Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
    await ctx.reply(`❌ Ошибка при загрузке аниме: ${errorMsg}`);
  }
}