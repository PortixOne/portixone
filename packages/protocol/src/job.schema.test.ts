import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CONTENT_LENGTH, MAX_COPIES, printJobSchema } from './job.schema.js';

test('accepts a minimal valid job', () => {
  const result = printJobSchema.safeParse({ content: 'hello' });
  assert.equal(result.success, true);
});

test('accepts an optional in-range copies and printerName', () => {
  const result = printJobSchema.safeParse({ content: 'x', printerName: 'SICAR WL88S', copies: 3 });
  assert.equal(result.success, true);
});

test('rejects empty content', () => {
  assert.equal(printJobSchema.safeParse({ content: '' }).success, false);
});

test('rejects missing content', () => {
  assert.equal(printJobSchema.safeParse({ copies: 1 }).success, false);
});

// S2: content upper bound
test('accepts content exactly at MAX_CONTENT_LENGTH', () => {
  const result = printJobSchema.safeParse({ content: 'a'.repeat(MAX_CONTENT_LENGTH) });
  assert.equal(result.success, true);
});

test('rejects content over MAX_CONTENT_LENGTH', () => {
  const result = printJobSchema.safeParse({ content: 'a'.repeat(MAX_CONTENT_LENGTH + 1) });
  assert.equal(result.success, false);
});

// S1: copies bounds
test('rejects copies = 0, negative, and fractional', () => {
  for (const copies of [0, -1, 1.5]) {
    assert.equal(printJobSchema.safeParse({ content: 'x', copies }).success, false, `copies=${copies}`);
  }
});

test('accepts copies exactly at MAX_COPIES', () => {
  assert.equal(printJobSchema.safeParse({ content: 'x', copies: MAX_COPIES }).success, true);
});

test('rejects copies over MAX_COPIES (the runaway-loop guard)', () => {
  for (const copies of [MAX_COPIES + 1, 1_000_000]) {
    assert.equal(printJobSchema.safeParse({ content: 'x', copies }).success, false, `copies=${copies}`);
  }
});
