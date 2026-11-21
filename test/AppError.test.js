import test from 'node:test';
import assert from 'node:assert/strict';
import AppError from '../utils/AppError.js';

test('AppError keeps its message and HTTP status', () => {
  const error = new AppError('Resource not found.', 404);

  assert.equal(error.message, 'Resource not found.');
  assert.equal(error.statusCode, 404);
  assert.equal(error.status, 'fail');
  assert.equal(error.isOperational, true);
});

test('AppError defaults to an internal server error', () => {
  const error = new AppError('Unexpected failure.');

  assert.equal(error.statusCode, 500);
  assert.equal(error.status, 'error');
});

test('AppError preserves optional validation details', () => {
  const details = [{ field: 'email', message: 'Email is invalid.' }];
  const error = new AppError('Validation failed.', 400, details);

  assert.deepEqual(error.details, details);
});
