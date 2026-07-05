type LogLevel = "debug" | "info" | "warn" | "error";

const safeJsonStringify = (value: unknown, replacer?: (string | number)[]): string => {
  try {
    return JSON.stringify(value, replacer);
  } catch {
    return JSON.stringify({ unserializable: true });
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      json: safeJsonStringify(error, Object.getOwnPropertyNames(error))
    };
  }

  if (isRecord(error)) {
    const ownPropertyNames = Object.getOwnPropertyNames(error);
    return {
      name: typeof error.name === "string" ? error.name : undefined,
      message: typeof error.message === "string" ? error.message : undefined,
      stack: typeof error.stack === "string" ? error.stack : undefined,
      json: safeJsonStringify(error, ownPropertyNames)
    };
  }

  return {
    name: undefined,
    message: typeof error === "string" ? error : String(error),
    stack: undefined,
    json: safeJsonStringify(error)
  };
};

const format = (level: LogLevel, message: string, meta?: unknown): string => {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (meta === undefined) {
    return base;
  }
  return `${base} ${safeJsonStringify(meta)}`;
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
