const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const SECRET_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie)/i;

const configured = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
const threshold = LEVELS[configured] ?? LEVELS.info;

export const log = {
  error: (message, context = {}) => write("error", message, context),
  warn: (message, context = {}) => write("warn", message, context),
  info: (message, context = {}) => write("info", message, context),
  debug: (message, context = {}) => write("debug", message, context)
};

function write(level, message, context) {
  if ((LEVELS[level] ?? LEVELS.info) > threshold) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(context)
  };
  const line = `${JSON.stringify(entry)}\n`;
  if (level === "error") process.stderr.write(line);
  else process.stdout.write(line);
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_PATTERN.test(key) ? "[redacted]" : redact(item)
    ])
  );
}

