export function assertProductionEnvironment(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const secret = env.JWT_SECRET || '';
  if (secret.length < 32 || /replace|change.?this|example/i.test(secret)) {
    throw new Error('Production requires a unique, high-entropy JWT_SECRET of at least 32 characters.');
  }

  const origins = env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins?.length || origins.includes('*')) {
    throw new Error('Production requires an explicit CORS_ORIGIN allowlist; wildcard origins are not allowed.');
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGIN contains an invalid origin: ${origin}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGIN entries must be exact http(s) origins without paths or trailing slashes.');
    }
  }
}
