// src/utils/logger.ts

/**
 * Утилита для логирования с временными метками
 */

function formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

function formatMessage(...args: any[]): string {
    const timestamp = formatTimestamp();
    const message = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
    
    return `[${timestamp}] ${message}`;
}

export const logger = {
    log: (...args: any[]): void => {
        console.log(formatMessage(...args));
    },
    
    error: (...args: any[]): void => {
        console.error(formatMessage(...args));
    },
    
    warn: (...args: any[]): void => {
        console.warn(formatMessage(...args));
    },
    
    debug: (...args: any[]): void => {
        console.debug(formatMessage(...args));
    }
};

