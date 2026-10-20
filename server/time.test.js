const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDisplayTime, resolveTimeZone } = require('./app');
const { dayBounds } = require('./validation');

test('campo time dos APKs antigos usa o fuso de exibição, não o do servidor', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    assert.equal(formatDisplayTime('2026-10-06T15:30:00.000Z'), '12:30');
    assert.equal(formatDisplayTime('2026-10-07T02:59:00.000Z'), '23:59');
    assert.equal(formatDisplayTime('2026-10-07T03:00:00.000Z'), '00:00');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('fuso inválido em DISPLAY_TIME_ZONE volta para America/Sao_Paulo', () => {
  assert.equal(resolveTimeZone('Fuso/Inexistente'), 'America/Sao_Paulo');
  assert.equal(resolveTimeZone('Asia/Tokyo'), 'Asia/Tokyo');
});

test('limites do dia enviados por um aparelho em outro fuso são respeitados', () => {
  const { dayStart, dayEnd } = dayBounds('2026-10-06T15:00:00.000Z', '2026-10-07T15:00:00.000Z');
  assert.equal(dayStart.toISOString(), '2026-10-06T15:00:00.000Z');
  assert.equal(dayEnd.toISOString(), '2026-10-07T15:00:00.000Z');
});
