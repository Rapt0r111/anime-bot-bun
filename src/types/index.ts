// src/types/index.ts

import type { Context } from 'grammy';
import type { AnimeCard } from '../services/parser';

// ==================== Callback Data Types ====================
export type CallbackAction = 
  | 'select'
  | 'select_latest'
  | 'dl'
  | 'cancel'
  | 'latest_list'
  | 'start_search'
  | 'noop';

export interface ParsedCallback {
  action: CallbackAction;
  params: string[];
}

export interface SelectCallbackData {
  action: 'select' | 'select_latest';
  shortId: string;
  animeIndex?: number;
  page: number;
}

export interface DownloadCallbackData {
  action: 'dl';
  shortId: string;
}

// ==================== Job Types ====================
export interface VideoJobData {
  recordId: number;
  pageUrl: string;
  userId: number;
  chatId?: number;
  forcedVideoId?: string;
  epName: string;
  backKey?: string;
  startMsgId?: number;
}

// ==================== UI Types ====================
export interface LatestListUI {
  caption: string;
  keyboard: any; // InlineKeyboard
}

export interface PaginationParams {
  action: 'select' | 'select_latest';
  shortId: string;
  animeIndex?: number;
  currentPage: number;
  totalPages: number;
}

// ==================== Release Types ====================
export interface ReleaseCandidate {
  card: AnimeCard;
  releaseId: string;
}

// ==================== Status Updater ====================
export interface StatusUpdater {
  (text: string, force?: boolean): Promise<void>;
}

// ==================== Download Result ====================
export interface DownloadResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  downloadTime: number;
}

// ==================== Extended Context ====================
export type BotContext = Context;