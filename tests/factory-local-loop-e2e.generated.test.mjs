import test from 'node:test';
import assert from 'node:assert/strict';

export function normalizeInput(value) {
  return String(value ?? '').trim().toLowerCase();
}

test('normalizeInput test', () => {
  assert.equal(normalizeInput('  GCAN Factory  '), 'gcan factory');
});