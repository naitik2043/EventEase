const output = {
  info: console.log,
  warn: console.warn,
  error: console.error
};

/**
 * Emit one structured JSON log record. Credentials, tokens, request bodies,
 * and query strings are intentionally excluded from application logs.
 */
export function log(level, event, fields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields
  };

  (output[level] || console.log)(JSON.stringify(record));
}
