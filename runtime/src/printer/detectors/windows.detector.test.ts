import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectivePrinterStatus } from './windows.detector.js';

// #5: WorkOffline is the truthful disconnect signal when Get-Printer's status lies.
test('WorkOffline=true overrides a lying "Normal" status to Offline', () => {
  assert.equal(effectivePrinterStatus('Normal', true), 'Offline');
});

test('WorkOffline=false keeps the reported status', () => {
  assert.equal(effectivePrinterStatus('Normal', false), 'Normal');
  assert.equal(effectivePrinterStatus('PaperOut', false), 'PaperOut');
});

test('WorkOffline undefined keeps the reported status (no signal available)', () => {
  assert.equal(effectivePrinterStatus('Normal', undefined), 'Normal');
  assert.equal(effectivePrinterStatus(undefined, undefined), undefined);
});

test('a genuinely Offline status is preserved regardless of WorkOffline', () => {
  assert.equal(effectivePrinterStatus('Offline', false), 'Offline');
  assert.equal(effectivePrinterStatus('Offline', true), 'Offline');
});
