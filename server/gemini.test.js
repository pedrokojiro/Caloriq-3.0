const test = require('node:test');
const assert = require('node:assert/strict');
const { generateContent, modelChain, GeminiProxyError } = require('./gemini');

const env = { GEMINI_API_KEY: 'chave-de-teste' };
const ok = (payload) => ({ ok: true, status: 200, json: async () => payload });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });
const modelOf = (url) => decodeURIComponent(String(url).match(/models\/([^:]+):/)[1]);
const noSleep = async () => {};

test('a ordem dos modelos começa no principal e não repete', () => {
  assert.deepEqual(modelChain({ GEMINI_MODEL: 'a' }), ['a', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.deepEqual(modelChain({ GEMINI_MODEL: 'gemini-3.8-flash' }), ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.deepEqual(modelChain({ GEMINI_MODEL: 'a', GEMINI_FALLBACK_MODELS: '' }), ['a']);
  assert.deepEqual(modelChain({ GEMINI_MODEL: 'a', GEMINI_FALLBACK_MODELS: 'b, c' }), ['a', 'b', 'c']);
});

test('modelo principal sobrecarregado (503) cai para o próximo e responde', async () => {
  const called = [];
  const fetchImpl = async (url) => { called.push(modelOf(url)); return called.length <= 2 ? fail(503) : ok({ candidates: [{}] }); };
  const result = await generateContent({}, { env, fetchImpl, sleep: noSleep });
  assert.deepEqual(result, { candidates: [{}] });
  // principal (2 tentativas) e depois o primeiro reserva.
  assert.deepEqual(called, ['gemini-3.6-flash', 'gemini-3.6-flash', 'gemini-3.8-flash']);
});

test('cota estourada (429) também tenta o próximo modelo', async () => {
  let calls = 0;
  const fetchImpl = async () => (++calls === 1 ? fail(429) : ok({ ok: true }));
  assert.deepEqual(await generateContent({}, { env, fetchImpl, sleep: noSleep }), { ok: true });
  assert.equal(calls, 2);
});

test('chave recusada (403) falha na hora, sem tentar outros modelos', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return fail(403); };
  await assert.rejects(generateContent({}, { env, fetchImpl, sleep: noSleep }), error => error instanceof GeminiProxyError && error.code === 'CONFIG');
  assert.equal(calls, 1);
});

test('se todos os modelos estão sobrecarregados, devolve UNAVAILABLE', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return fail(503); };
  await assert.rejects(generateContent({}, { env, fetchImpl, sleep: noSleep }), error => error.code === 'UNAVAILABLE' && error.status === 503);
  assert.equal(calls, 6); // 3 modelos x 2 tentativas
});

test('sem chave configurada, avisa antes de chamar o Google', async () => {
  let called = false;
  await assert.rejects(generateContent({}, { env: {}, fetchImpl: async () => { called = true; }, sleep: noSleep }), error => error.code === 'CONFIG' && error.status === 503);
  assert.equal(called, false);
});
