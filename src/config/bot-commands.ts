// src/config/bot-commands.ts

/**
 * Список команд бота для регистрации в Telegram
 */
export const BOT_COMMANDS = [
    {
      command: 'start',
      description: 'Главное меню и быстрые действия',
    },
    {
      command: 'latest',
      description: 'Показать топ-10 новых релизов',
    },
    {
      command: 'search',
      description: 'Как искать аниме по названию',
    },
    {
      command: 'stats',
      description: 'Статистика бота',
    },
    {
      command: 'top',
      description: 'Топ 10 популярных аниме',
    },
  ] as const;
  
  /**
   * Типы команд
   */
  export type BotCommand = (typeof BOT_COMMANDS)[number]['command'];