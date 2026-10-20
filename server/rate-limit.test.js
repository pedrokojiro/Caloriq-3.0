const test = require('node:test');
const assert = require('node:assert/strict');
const { FixedWindowLimiter, ConcurrencyLimiter } = require('./rate-limit');

test('janela fixa bloqueia acima do limite e libera após a janela', () => {
  let now = 0;
  const limiter = new FixedWindowLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.equal(limiter.hit('a').allowed, true);
  assert.equal(limiter.hit('a').allowed, true);
  const blocked = limiter.hit('a');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
  assert.equal(limiter.hit('b').allowed, true, 'chaves diferentes são independentes');
  now = 1000;
  assert.equal(limiter.hit('a').allowed, true);
});

test('janela fixa remove entradas expiradas e respeita o teto de entradas', () => {
  let now = 0;
  const limiter = new FixedWindowLimiter({ limit: 1, windowMs: 1000, maxEntries: 3, now: () => now });
  for (let index = 0; index < 10; index += 1) limiter.hit(`ip-${index}`);
  assert.equal(limiter.size, 3, 'mantém só as entradas mais recentes');
  assert.equal(limiter.hit('ip-9').allowed, false, 'a entrada mais recente continua contando');
  now = 5000;
  limiter.hit('novo');
  assert.equal(limiter.size, 1, 'entradas expiradas são varridas');
});

test('limitador de concorrência libera vaga ao terminar', () => {
  const limiter = new ConcurrencyLimiter({ limit: 2 });
  const first = limiter.acquire('u');
  const second = limiter.acquire('u');
  assert.ok(first && second);
  assert.equal(limiter.acquire('u'), null);
  first();
  first();
  const third = limiter.acquire('u');
  assert.ok(third, 'liberar duas vezes não abre vagas extras');
  assert.equal(limiter.acquire('u'), null);
  second();
  third();
  assert.equal(limiter.size, 0);
});
