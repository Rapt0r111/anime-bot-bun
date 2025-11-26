// src/services/parser.ts

import * as cheerio from 'cheerio';
import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { PARSER_CONFIG } from '../config/constants';

const MIRROR_DOMAIN = PARSER_CONFIG.MIRROR_DOMAIN;
const BASE_URL = `https://${MIRROR_DOMAIN}`;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01', // Изменено для AJAX
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Connection': 'keep-alive',
    'X-Requested-With': 'XMLHttpRequest', // Добавлено
    'Upgrade-Insecure-Requests': '1'
};

const CACHE_TTL = 10 * 60 * 1000;
const MAX_RETRIES = 3;
const MAX_LOG_SNIPPET = 220;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// ==================== INTERFACES ====================
export interface AnimeCard {
    title: string;
    url: string;
    imageUrl: string;
    description: string;
}

export interface SearchResult {
    title: string;
    url: string;
    id: string;
}

export interface AnimePageData {
    name: string;
    imageUrl?: string;
    description: string;
    meta?: string;
    series: { name: string; id: string }[];
}

export interface VideoResult {
    directUrls: string[];
    name: string;
    quality: string;
}

// ==================== ERRORS ====================
export class ParserError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'ParserError';
    }
}

// ==================== CACHE ====================
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class Cache<T> {
    private store = new Map<string, CacheEntry<T>>();
    private ttl: number;
    private cleanupTimer: NodeJS.Timeout;

    constructor(ttl: number) {
        this.ttl = ttl;
        this.cleanupTimer = setInterval(() => this.cleanup(), ttl);
    }

    set(key: string, data: T): void {
        this.store.set(key, { data, timestamp: Date.now() });
    }

    get(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }

    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.store.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.store.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.debug(`[Cache] Cleaned ${cleaned} entries`);
        }
    }

    clear(): void {
        clearInterval(this.cleanupTimer);
        this.store.clear();
    }

    get size(): number {
        return this.store.size;
    }
}

const latestCache = new Cache<AnimeCard[]>(CACHE_TTL);
const seriesCache = new Cache<AnimePageData>(CACHE_TTL);

// ==================== UTILITIES ====================
function normalizeUrl(url: string | undefined, base: string): string {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url.replace(/https?:\/\/[^\/]+/, base);
    }
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function truncateForLog(input: string | undefined | null): string {
    if (!input) return '';
    return input.length > MAX_LOG_SNIPPET
        ? `${input.slice(0, MAX_LOG_SNIPPET)}…`
        : input;
}

// Улучшенная функция с retry и обработкой ошибок
async function fetchHtml(url: string, options: any = {}): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await axios.get(url, {
                ...options,
                headers: { ...HEADERS, ...options.headers },
                timeout: 15000,
                validateStatus: (status) => status < 500 // Retry только на 5xx
            });

            // Проверка на капчу/блокировку
            if (response.data.includes('captcha') || response.data.includes('cloudflare')) {
                throw new ParserError(
                    'Captcha or CloudFlare protection detected',
                    'CAPTCHA_DETECTED',
                    false
                );
            }

            return response.data;
        } catch (err) {
            lastError = err as Error;

            // Логика повторных попыток
            if (axios.isAxiosError(err)) {
                const axiosError = err as AxiosError;

                // Не повторяем при 4xx (кроме 429)
                if (axiosError.response?.status &&
                    axiosError.response.status >= 400 &&
                    axiosError.response.status < 500 &&
                    axiosError.response.status !== 429) {
                    throw new ParserError(
                        `HTTP ${axiosError.response.status}`,
                        'HTTP_CLIENT_ERROR',
                        false
                    );
                }
            }

            if (attempt < MAX_RETRIES - 1) {
                const delay = RETRY_DELAYS[attempt] || 4000;
                logger.warn(`[Parser] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    throw new ParserError(
        `Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
        'MAX_RETRIES_EXCEEDED',
        true
    );
}

// ==================== LATEST ANIME ====================
export async function getLatestAnime(options: { forceRefresh?: boolean } = {}): Promise<AnimeCard[]> {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
        const cached = latestCache.get('latest');
        if (cached) {
            logger.debug(`[Parser] Using cached latest (${cached.length} items)`);
            return cached;
        }
    }

    try {
        logger.log(`[Parser] Fetching latest from ${BASE_URL}...`);
        const html = await fetchHtml(BASE_URL);
        const $ = cheerio.load(html);
        const results: AnimeCard[] = [];

        $('.shortstory').each((_, el) => {
            const $el = $(el);
            const titleEl = $el.find('.shortstoryHead a');
            const title = titleEl.text().trim();
            const url = normalizeUrl(titleEl.attr('href'), BASE_URL);
            const img = normalizeUrl($el.find('.imgRadius').attr('src'), BASE_URL);
            let desc = $el.find('p').last().text().trim();

            if (desc.length > 200) desc = desc.substring(0, 197) + '...';

            if (title && url) {
                results.push({ title, url, imageUrl: img, description: desc });
            }
        });

        if (results.length === 0) {
            throw new ParserError('No anime found on page', 'NO_RESULTS', true);
        }

        latestCache.set('latest', results);
        logger.log(`[Parser] Cached ${results.length} latest anime`);
        return results;
    } catch (e) {
        if (e instanceof ParserError) throw e;
        logger.error("[Parser] Latest Error:", e instanceof Error ? e.message : e);
        throw new ParserError(
            'Failed to fetch latest anime',
            'FETCH_ERROR',
            true
        );
    }
}

// ==================== SEARCH ====================
export async function searchAnime(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
        throw new ParserError('Empty search query', 'INVALID_INPUT', false);
    }

    try {
        const params = new URLSearchParams();
        params.append('do', 'search');
        params.append('subaction', 'search');
        params.append('story', query);

        const response = await axios.post(`${BASE_URL}/index.php?do=search`, params, {
            headers: HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results: SearchResult[] = [];

        $('.shortstory').each((_, el) => {
            const $el = $(el);
            const link = $el.find('.shortstoryHead a');
            const title = link.text().trim();
            const url = normalizeUrl(link.attr('href'), BASE_URL);

            if (title && url) {
                const [rawTitleSegment] = title.split('[');
                const cleanTitle = (rawTitleSegment ?? title).trim();
                results.push({ title: cleanTitle, url, id: url });
            }
        });

        logger.log(`[Parser] Search "${query}": ${results.length} results`);
        return results.slice(0, 10);
    } catch (e) {
        logger.error('[Parser] Search error:', e);
        throw new ParserError(
            'Search failed',
            'SEARCH_ERROR',
            true
        );
    }
}

// ==================== SERIES ====================
export async function getAnimeSeries(pageUrl: string): Promise<AnimePageData> {
    const cached = seriesCache.get(pageUrl);
    if (cached) {
        logger.debug('[Parser] Using cached series');
        return cached;
    }

    try {
        const targetUrl = normalizeUrl(pageUrl, BASE_URL);
        const html = await fetchHtml(targetUrl);
        const $ = cheerio.load(html);

        const [rawNameSegment] = $('.shortstoryHead h1').text().split('/');
        const name = (rawNameSegment?.trim() || "Anime");
        const imageUrl = normalizeUrl($('.imgRadius').attr('src'), BASE_URL);

        let description = '';
        $('.shortstoryContent p').each((_, el) => {
            const text = $(el).text().trim();
            if (!text.startsWith('Год выхода:') &&
                !text.startsWith('Жанр:') &&
                text.length > 0) {
                description += text + '\n\n';
            }
        });

        if (!description) description = $('[itemprop="description"]').text().trim();
        description = description.replace(/Скачать (все серии|аниме).*?$/i, '').trim();

        let meta = '';
        $('.shortstoryContent p').each((_, el) => {
            const t = $(el).text();
            if (t.includes('Год выхода:') || t.includes('Жанр:')) {
                meta += t.trim() + '\n';
            }
        });

        const series: { name: string; id: string }[] = [];
        const scriptContent = $('script').text();
        const dataMatch = scriptContent.match(/var data\s*=\s*({[\s\S]*?});/);

        if (dataMatch?.[1]) {
            try {
                const rawJson = dataMatch[1]
                    .replace(/'/g, '"')
                    .replace(/,\s*}/g, '}');

                const data = JSON.parse(rawJson);
                const sortedKeys = Object.keys(data).sort((a, b) => {
                    const numA = parseInt(a.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.replace(/\D/g, '')) || 0;
                    return numA - numB;
                });

                for (const key of sortedKeys) {
                    series.push({ name: key, id: String(data[key]) });
                }
            } catch (e) {
                logger.warn('[Parser] JSON parse failed, using regex fallback');
                const regex = /["'](.*?)["']\s*:\s*["']?(\d+)["']?/g;
                let m;
                while ((m = regex.exec(dataMatch[1])) !== null) {
                    if (m[1] && m[2]) series.push({ name: m[1], id: m[2] });
                }
            }
        }

        if (series.length === 0) {
            series.push({ name: "Смотреть фильм/серии", id: "auto" });
        }

        const result = { name, imageUrl, description, meta, series };
        seriesCache.set(pageUrl, result);
        logger.log(`[Parser] Cached ${series.length} episodes for "${name}"`);
        return result;
    } catch (e) {
        if (e instanceof ParserError) throw e;
        logger.error("[Parser] Error parsing series:", e);
        throw new ParserError(
            'Failed to parse anime page',
            'PARSE_ERROR',
            true
        );
    }
}

// ==================== VIDEO EXTRACTION ====================
function parseFrame5Links(rawString: string, animeName: string): VideoResult {
    logger.log(`[Parser] Parsing frame5 links (len: ${rawString.length}): ${truncateForLog(rawString)}`);

    let bestUrls: string[] = [];
    let finalQuality = '480p (SD)';

    // Поиск FHD / 1080p
    const fhdMatch = rawString.match(/\[FHD\s*\(1080[pр]\)\](.*?)(?:,\[|$)/i);
    if (fhdMatch?.[1]) {
        const urls = extractUrlsFromBlock(fhdMatch[1]);
        if (urls.length > 0) {
            bestUrls = urls;
            finalQuality = '1080p (FHD)';

            // Мы нашли 1080p. Возвращаем результат.
            // Даже если ссылки потом окажутся нерабочими, мы НЕ переходим к 720p/480p.
            return {
                directUrls: bestUrls,
                name: animeName,
                quality: finalQuality
            };
        }
    }

    const hdMatch = rawString.match(/\[HD\s*\(720[pр]\)\](.*?)(?:,\[|$)/i);

    if (hdMatch?.[1]) {
        const urls = extractUrlsFromBlock(hdMatch[1]);
        if (urls.length > 0) {
            bestUrls = urls;
            finalQuality = '720p (HD)';

            return {
                directUrls: bestUrls,
                name: animeName,
                quality: finalQuality
            };
        }
    }
    throw new ParserError(
        'High quality (1080p/720p) not found. SD (480p) is disabled by config.',
        'NO_HIGH_QUALITY_URLS',
        false // false означает, что нет смысла повторять попытки (retry), если качества нет
    );
}

function extractUrlsFromBlock(block: string): string[] {
    return block
        .split(' or ')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('http'))
        .sort((a, b) => {
            const score = (u: string) => {
                if (u.includes('trn.su')) return 2;
                if (u.includes('tigerlips')) return 1;
                return 0;
            };
            return score(b) - score(a);
        });
}

export async function extractVideoUrl(
    pageUrl: string,
    forcedVideoId?: string
): Promise<VideoResult> {
    logger.log(`[Parser] Opening page: ${pageUrl}`);

    try {
        const html = await fetchHtml(pageUrl);

        const nameMatch = html.match(/<div class="shortstoryHead">\s*<h1>\s*(.*?)\s*<\/h1>/s);
        const rawFullName = nameMatch?.[1]?.trim() || 'Unknown Anime';
        const [namePrimary = rawFullName] = rawFullName.split('[');
        const cleanName = namePrimary.trim();

        let targetId = forcedVideoId;
        if (!targetId || targetId === 'auto') {
            const dataMatch = html.match(/var data = ({.*?});/);
            const episodesPayload = dataMatch?.[1];

            if (!episodesPayload) {
                throw new ParserError(
                    'Episodes data not found',
                    'NO_EPISODES_DATA',
                    false
                );
            }

            const episodesData = JSON.parse(episodesPayload);
            // Сортируем ключи, чтобы точно взять первую серию, если порядок сбит
            const sortedKeys = Object.keys(episodesData).sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numA - numB;
            });
            const firstKey = sortedKeys[0];

            if (!firstKey) {
                throw new ParserError(
                    'Episodes data is empty',
                    'EMPTY_EPISODES',
                    false
                );
            }

            targetId = episodesData[firstKey];
            logger.log(`[Parser] Auto-selected episode: ${firstKey} (ID: ${targetId})`);
        }

        if (!targetId) {
            throw new ParserError('Video ID not found', 'NO_VIDEO_ID', false);
        }

        // Обязательно old=1, как вы и просили
        const frameUrl = `${BASE_URL}/frame5.php?play=${targetId}&old=1`;
        logger.log(`[Parser] Fetching Player #2 (frame5) for ID: ${targetId}`);

        const frameResponse = await axios.get(frameUrl, {
            headers: {
                ...HEADERS,
                'Referer': pageUrl,
            },
            timeout: 15000
        });

        const frameHtml = frameResponse.data;

        if (frameHtml.includes('недоступен по просьбе правообладателей') || 
            frameHtml.includes('на територии РФ')) {
            logger.warn(`[Parser] Geo-block detected for ID ${targetId}`);
            throw new ParserError(
                'Video is geo-blocked (Copyright restriction)',
                'GEO_BLOCK',
                false // false = нет смысла повторять попытку без смены IP
            );
        }

        let rawLinks: string | undefined;

        // 1. Попытка найти ссылки в конфигурации Playerjs ("file":"...")
        // Ищем паттерн: "file":"строка со ссылками"
        const playerJsMatch = frameHtml.match(/"file"\s*:\s*"(.*?)"/);

        if (playerJsMatch && playerJsMatch[1]) {
            rawLinks = playerJsMatch[1];
            logger.log('[Parser] Found links in Playerjs config');
        }

        // 2. Резервный метод: Парсинг кнопок "Скачать" (div id="dow")
        // Если JS обфусцирован или изменился, кнопки часто остаются
        if (!rawLinks) {
            logger.log('[Parser] Playerjs config not found, trying download buttons...');
            const $ = cheerio.load(frameHtml);
            const downloadLinks: string[] = [];

            $('#dow .butt').each((_, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim(); // Например: "480p (SD)"

                if (href && href.startsWith('http')) {
                    // Формируем строку совместимую с вашей функцией parseFrame5Links
                    // Формат: [Качество]Ссылка
                    downloadLinks.push(`[${text}]${href}`);
                }
            });

            if (downloadLinks.length > 0) {
                rawLinks = downloadLinks.join(',');
                logger.log(`[Parser] Found ${downloadLinks.length} buttons in HTML`);
            }
        }

        if (!rawLinks) {
            if (frameHtml.includes('checkExternalImage')) {
                logger.warn('[Parser] Warning: frame5 contains checkExternalImage logic');
            }
            // Логируем часть HTML для отладки, если ничего не нашли
            logger.debug(`[Parser] Frame HTML snippet: ${truncateForLog(frameHtml)}`);

            throw new ParserError(
                `Could not find video links in frame5 response for ID ${targetId}`,
                'NO_LINKS_FOUND',
                true
            );
        }

        // Ваша существующая функция парсинга отлично справится с форматом Playerjs
        const result = parseFrame5Links(rawLinks, cleanName);

        logger.log(`[Parser] ✅ Success! Quality: ${result.quality}. Mirrors: ${result.directUrls.length}`);

        return result;
    } catch (e) {
        if (e instanceof ParserError) throw e;
        logger.error('[Parser] extractVideoUrl error:', e);
        throw new ParserError(
            'Failed to extract video URL',
            'EXTRACTION_ERROR',
            true
        );
    }
}

// ==================== CLEANUP ====================
export async function closeBrowser(): Promise<void> {
    latestCache.clear();
    seriesCache.clear();
}

// Экспортируем кэши для мониторинга
export function getCacheStats() {
    return {
        latest: latestCache.size,
        series: seriesCache.size
    };
}