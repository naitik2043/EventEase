import test from 'node:test';
import assert from 'node:assert/strict';
import { assertProductionEnvironment } from '../config/runtime.js';

const validProductionEnvironment = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(48),
  CORS_ORIGIN: 'https://app.example.com'
};

test('allows non-production environments without production-only secrets', () => {
  assert.doesNotThrow(() => assertProductionEnvironment({ NODE_ENV: 'test' }));
  assert.doesNotThrow(() => assertProductionEnvironment({ NODE_ENV: 'development' }));
});

test('accepts a strong JWT secret and exact CORS origins in production', () => {
  assert.doesNotThrow(() => assertProductionEnvironment(validProductionEnvironment));
  assert.doesNotThrow(() => assertProductionEnvironment({
    ...validProductionEnvironment,
    CORS_ORIGIN: 'https://app.example.com,https://admin.example.com'
  }));
});

test('rejects missing, weak, and placeholder production JWT secrets', () => {
  assert.throws(
    () => assertProductionEnvironment({ ...validProductionEnvironment, JWT_SECRET: '' }),
    /JWT_SECRET/
  );
  assert.throws(
    () => assertProductionEnvironment({ ...validProductionEnvironment, JWT_SECRET: 'short-secret' }),
    /JWT_SECRET/
  );
  assert.throws(
    () => assertProductionEnvironment({
      ...validProductionEnvironment,
      JWT_SECRET: 'replace-this-with-a-real-long-production-secret'
    }),
    /JWT_SECRET/
  );
});

test('rejects missing and wildcard production CORS allowlists', () => {
  assert.throws(
    () => assertProductionEnvironment({ ...validProductionEnvironment, CORS_ORIGIN: '' }),
    /CORS_ORIGIN/
  );
  assert.throws(
    () => assertProductionEnvironment({ ...validProductionEnvironment, CORS_ORIGIN: '*' }),
    /CORS_ORIGIN/
  );
});

test('rejects malformed or non-origin CORS entries', () => {
  for (const origin of ['not-a-url', 'https://app.example.com/dashboard', 'ftp://app.example.com']) {
    assert.throws(
      () => assertProductionEnvironment({ ...validProductionEnvironment, CORS_ORIGIN: origin }),
      /CORS_ORIGIN/
    );
  }
});
