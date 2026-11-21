import test from 'node:test';
import assert from 'node:assert/strict';
import asyncHandler from '../utils/asyncHandler.js';

test('asyncHandler forwards request, response, and next to the wrapped handler', async () => {
  const req = { method: 'GET' };
  const res = { statusCode: 200 };
  let called = false;

  const handler = asyncHandler(async (receivedReq, receivedRes, next) => {
    called = true;
    assert.equal(receivedReq, req);
    assert.equal(receivedRes, res);
    assert.equal(typeof next, 'function');
  });

  handler(req, res, () => {});
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(called, true);
});

test('asyncHandler forwards rejected promises to next', async () => {
  const expectedError = new Error('Controller failed.');
  let forwardedError;

  const handler = asyncHandler(async () => {
    throw expectedError;
  });

  handler({}, {}, (error) => {
    forwardedError = error;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(forwardedError, expectedError);
});
