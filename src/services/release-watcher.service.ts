// src/services/release-watcher.service.ts

import { createHash } from 'node:crypto';
import { bot } from '../core';
import { releaseRepository } from '../db/repositories/release.repository';
import { getLatestAnime } from './parser';
import type { AnimeCard } from './parser';
import type { ReleaseCandidate } from '../types';
import { getAllSubscribers, removeSubscriber } from '../bot/middlewares/subscriber.middleware';
import { buildReleaseKeyboard } from '../bot/ui/keyboards';
import { buildReleaseCaption } from '../bot/ui/messages';
import { GrammyError } from 'grammy';
import { logger } from '../utils/logger';
import { RELEASE_WATCHER } from '../config/constants';

let releasePollTimer: ReturnType<typeof setInterval> | null = null;
let releasePollInProgress = false;

/**
 * Создать уникальный ID релиза
 */
function buildReleaseId(card: AnimeCard): string {
  return createHash('sha1')
    .update(`${card.url}::${card.title}`.toLowerCase())
    .digest('hex');
}

/**
 * Отправить уведомление о релизе подписчику
 */
async function sendReleaseNotification(
  chatId: number,
  card: AnimeCard,
  caption: string
): Promise<void> {
  const keyboard = buildReleaseKeyboard(card);

  try {
    if (card.imageUrl) {
      await bot.api.sendPhoto(chatId, card.imageUrl, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await bot.api.sendMessage(chatId, caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 403) {
      logger.warn(`[ReleaseWatcher] Chat ${chatId} blocked the bot. Removing from list.`);
      await removeSubscriber(chatId);
      return;
    }

    logger.error(`[ReleaseWatcher] Failed to notify chat ${chatId}:`, err);
  }
}

/**
 * Уведомить всех подписчиков о новых релизах
 */
async function notifySubscribersAboutReleases(
  releases: ReleaseCandidate[]
): Promise<void> {
  if (!releases.length) return;

  const targets = await getAllSubscribers();
  if (!targets.length) {
    logger.log('[ReleaseWatcher] No subscribers to notify');
    return;
  }

  for (const release of releases) {
    const caption = buildReleaseCaption(release.card);
    for (const subscriber of targets) {
      await sendReleaseNotification(Number(subscriber.chatId), release.card, caption);
    }
  }
}

/**
 * Проверить новые релизы
 */
async function pollLatestReleases(): Promise<void> {
  if (releasePollInProgress) return;
  releasePollInProgress = true;

  try {
    const cards = await getLatestAnime({ forceRefresh: true });
    if (!cards.length) return;

    const candidates = cards
      .slice(0, RELEASE_WATCHER.TOP_ITEMS_COUNT)
      .map<ReleaseCandidate>((card) => ({
        card,
        releaseId: buildReleaseId(card),
      }));

    const releaseIds = candidates.map((candidate) => candidate.releaseId);
    if (!releaseIds.length) return;

    const existing = await releaseRepository.findExistingReleases(releaseIds);

    const known = new Set(existing.map((row) => row.releaseId));
    const fresh = candidates.filter((candidate) => !known.has(candidate.releaseId));

    if (!fresh.length) return;

    await releaseRepository.createReleases(
      fresh.map(({ releaseId, card }) => ({
        releaseId,
        title: card.title,
        url: card.url,
        imageUrl: card.imageUrl,
        description: card.description,
      }))
    );

    await notifySubscribersAboutReleases(fresh);

    logger.log(`[ReleaseWatcher] Notified about ${fresh.length} new release(s)`);
  } catch (err) {
    logger.error('[ReleaseWatcher] Failed to poll releases:', err);
  } finally {
    releasePollInProgress = false;
  }
}

/**
 * Запустить отслеживание релизов
 */
export function startReleaseWatcher(): void {
  if (releasePollTimer) return;

  void pollLatestReleases();
  releasePollTimer = setInterval(() => {
    void pollLatestReleases();
  }, RELEASE_WATCHER.POLL_INTERVAL_MS);

  logger.log(
    `[ReleaseWatcher] Started with interval ${RELEASE_WATCHER.POLL_INTERVAL_MS}ms`
  );
}

/**
 * Остановить отслеживание релизов
 */
export function stopReleaseWatcher(): void {
  if (releasePollTimer) {
    clearInterval(releasePollTimer);
    releasePollTimer = null;
    logger.log('[ReleaseWatcher] Stopped');
  }
}