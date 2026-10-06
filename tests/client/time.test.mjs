import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMealTime, localDayBounds } from '../../src/utils/time.ts';

// Node aplica mudanças em process.env.TZ imediatamente, o que permite simular
// aparelhos em fusos diferentes no mesmo processo.
function inTimeZone(zone, run) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try { run(); } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

test('horário da refeição segue o fuso do aparelho', () => {
  const consumedAt = '2026-10-06T15:30:00.000Z';
  inTimeZone('America/Sao_Paulo', () => assert.equal(formatMealTime(consumedAt), '12:30'));
  inTimeZone('Asia/Tokyo', () => assert.equal(formatMealTime(consumedAt), '00:30'));
  inTimeZone('UTC', () => assert.equal(formatMealTime(consumedAt), '15:30'));
  assert.equal(formatMealTime(undefined, '08:00'), '08:00', 'APK antigo sem consumedAt usa o campo time');
  assert.equal(formatMealTime('inválido', '08:00'), '08:00');
});

test('limites do dia viram exatamente na meia-noite local', () => {
  inTimeZone('America/Sao_Paulo', () => {
    const lastSecond = localDayBounds(new Date('2026-10-07T02:59:59.000Z')); // 23:59:59 de 06/10
    assert.deepEqual(lastSecond, { dayStart: '2026-10-06T03:00:00.000Z', dayEnd: '2026-10-07T03:00:00.000Z' });
    const midnight = localDayBounds(new Date('2026-10-07T03:00:00.000Z')); // 00:00 de 07/10
    assert.equal(midnight.dayStart, '2026-10-07T03:00:00.000Z');
  });
  inTimeZone('Asia/Tokyo', () => {
    const bounds = localDayBounds(new Date('2026-10-06T15:30:00.000Z')); // 00:30 de 07/10 em Tóquio
    assert.deepEqual(bounds, { dayStart: '2026-10-06T15:00:00.000Z', dayEnd: '2026-10-07T15:00:00.000Z' });
  });
});

test('dia com horário de verão continua dentro do limite aceito pela API', () => {
  inTimeZone('America/New_York', () => {
    const { dayStart, dayEnd } = localDayBounds(new Date('2026-03-08T12:00:00-04:00'));
    const hours = (new Date(dayEnd) - new Date(dayStart)) / 3_600_000;
    assert.equal(hours, 23);
    assert.ok(hours <= 27, 'o servidor aceita dias de até 27 h');
  });
});
