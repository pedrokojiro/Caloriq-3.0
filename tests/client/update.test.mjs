import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateUpdate, snoozeFor } from '../../src/utils/update.ts';

const info = { available: true, latestVersion: '1.4.0', latestVersionCode: 6, minVersionCode: 4, downloadUrl: 'https://expo.dev/a/x' };

test('aviso opcional, obrigatório ou nenhum conforme a versão instalada', () => {
  assert.equal(evaluateUpdate(info, 5, null), 'optional');
  assert.equal(evaluateUpdate(info, 6, null), 'none');
  assert.equal(evaluateUpdate(info, 7, null), 'none');
  assert.equal(evaluateUpdate(info, 3, null), 'required');
  assert.equal(evaluateUpdate({ available: false }, 5, null), 'none');
  assert.equal(evaluateUpdate(info, null, null), 'none', 'web e iOS não verificam');
});

test('"lembrar depois" adia só aquela versão e nunca adia a obrigatória', () => {
  const now = Date.UTC(2026, 9, 19);
  const snooze = snoozeFor(6, now);
  assert.equal(evaluateUpdate(info, 5, snooze, now + 1000), 'none');
  assert.equal(evaluateUpdate(info, 5, snooze, now + 4 * 86_400_000), 'optional', 'volta depois de 3 dias');
  assert.equal(evaluateUpdate({ ...info, latestVersionCode: 7 }, 5, snooze, now + 1000), 'optional', 'versão mais nova ignora o adiamento anterior');
  assert.equal(evaluateUpdate(info, 3, snooze, now + 1000), 'required');
});
