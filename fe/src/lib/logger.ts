const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]): void => {
        if (isDev) {
            // eslint-disable-next-line no-console
            console.log(...args); // only in dev
        }
    },
    warn: (...args: unknown[]): void => {
        if (isDev) {
            // eslint-disable-next-line no-console
            console.warn(...args);
        }
    },
    error: (...args: unknown[]): void => {
        // eslint-disable-next-line no-console
        console.error(...args); // always log errors
    },
};
