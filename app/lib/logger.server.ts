import pino from "pino";

const DEVELOPMENT = process.env.NODE_ENV === "development";

declare global {
  var __logger__: pino.Logger;
}

/**
 * Create and configure the Pino logger instance
 */
const createLogger = () => {
  return pino({
    level: process.env.LOG_LEVEL || (DEVELOPMENT ? "debug" : "info"),
    transport: DEVELOPMENT
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss o",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  });
};

// Singleton pattern to ensure only one logger instance
if (!global.__logger__) {
  global.__logger__ = createLogger();
}

export const logger = global.__logger__;
