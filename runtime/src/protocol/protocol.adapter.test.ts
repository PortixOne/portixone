import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { InvalidRequestError, PayloadTooLargeError } from '@portixone/shared';
import { readJsonBody } from './protocol.adapter.js';

/** Minimal stand-in for IncomingMessage: readJsonBody only async-iterates it. */
function mockReq(body: string | Buffer): IncomingMessage {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8');
  async function* chunks(): AsyncGenerator<Buffer> {
    yield buf;
  }
  return chunks() as unknown as IncomingMessage;
}

test('parses a valid JSON body', async () => {
  const parsed = await readJsonBody<{ content: string }>(mockReq('{"content":"hi"}'));
  assert.deepEqual(parsed, { content: 'hi' });
});

test('returns {} for an empty body', async () => {
  const parsed = await readJsonBody(mockReq(''));
  assert.deepEqual(parsed, {});
});

// B1: malformed JSON must be a 400 (InvalidRequestError), not a 500
test('throws InvalidRequestError on malformed JSON', async () => {
  await assert.rejects(
    () => readJsonBody(mockReq('}{not json')),
    (err: unknown) => err instanceof InvalidRequestError && (err as InvalidRequestError).code === 'INVALID_REQUEST',
  );
});

test('throws PayloadTooLargeError when the body exceeds the cap', async () => {
  await assert.rejects(
    () => readJsonBody(mockReq('x'.repeat(64)), 10),
    (err: unknown) => err instanceof PayloadTooLargeError && (err as PayloadTooLargeError).code === 'PAYLOAD_TOO_LARGE',
  );
});
