type LogLevel = "debug" | "info" | "warn" | "error";

const format = (level: LogLevel, message: string, meta?: unknown): string => {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (meta === undefined) {
    return base;
  }
  return `${base} ${JSON.stringify(meta)}`;
};

export const logger = {
  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(format("debug", message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    console.info(format("info", message, meta));
  },
  warn(message: string, meta?: unknown) {
    console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: unknown) {
    console.error(format("error", message, meta));
  }
};
