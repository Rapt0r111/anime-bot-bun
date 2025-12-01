/// <reference types="vite/client" />

interface TelegramWebApp {
    initDataUnsafe: {
      user?: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
      };
      query_id?: string;
      auth_date?: string;
      hash?: string;
    };
    ready: () => void;
    expand: () => void;
    close: () => void;
    MainButton: {
      text: string;
      color: string;
      textColor: string;
      isVisible: boolean;
      isActive: boolean;
      show: () => void;
      hide: () => void;
      enable: () => void;
      disable: () => void;
      onClick: (callback: () => void) => void;
      offClick: (callback: () => void) => void;
      setText: (text: string) => void;
    };
    HapticFeedback: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
      notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
      selectionChanged: () => void;
    };
  }
  
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }