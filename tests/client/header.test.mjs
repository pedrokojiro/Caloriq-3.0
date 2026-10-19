import test from 'node:test';
import assert from 'node:assert/strict';
import { toHeaderValue } from '../../src/utils/header.ts';

test('toHeaderValue keeps only visible ASCII', () => {
  assert.equal(toHeaderValue('motorola moto g56 5G · Android 16 · CaloriQ 1.4.0'), 'motorola moto g56 5G Android 16 CaloriQ 1.4.0');
  assert.equal(toHeaderValue('Galaxy Ação\n\tçÉ'), 'Galaxy Acao cE');
  assert.match(toHeaderValue('x'.repeat(300)), /^x{120}$/);
  for (const char of toHeaderValue('ñ·€😀 Pixel')) assert.ok(char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) <= 0x7e);
});
