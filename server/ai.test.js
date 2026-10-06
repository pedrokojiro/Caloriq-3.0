const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGeminiRequest } = require('./ai-validation');
const { createApp } = require('./app');
const { fakePool, startServer } = require('./test-helpers');

const scannerBody = {
  contents: [{ parts: [{ text: 'Analise a refeição na foto.' }, { inlineData: { mimeType: 'image/jpeg', data: 'aGVsbG8=' } }] }],
  generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192, temperature: 0.2 },
};
const chatBody = {
  systemInstruction: { parts: [{ text: 'Você é o NutriCaloriQ IA.' }] },
  contents: [
    { role: 'user', parts: [{ text: 'Oi' }] },
    { role: 'model', parts: [{ text: 'Olá!' }] },
    { role: 'user', parts: [{ text: 'Quantas calorias tem uma maçã?' }] },
  ],
  generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
};
const connectionTestBody = { contents: [{ parts: [{ text: 'Responda apenas OK.' }] }], generationConfig: { maxOutputTokens: 32 } };

test('aceita exatamente os pedidos do scanner, do chat e do teste de conexão', () => {
  for (const body of [scannerBody, chatBody, connectionTestBody]) {
    const result = buildGeminiRequest(body);
    assert.equal(result.error, undefined);
    assert.deepEqual(result.request, body);
  }
});

test('recusa campos extras, tamanhos e configurações fora do limite', () => {
  const cases = [
    { ...chatBody, tools: [{ googleSearch: {} }] },
    { ...chatBody, safetySettings: [] },
    { contents: [] },
    { contents: Array.from({ length: 11 }, () => ({ role: 'user', parts: [{ text: 'a' }] })) },
    { contents: [{ role: 'system', parts: [{ text: 'a' }] }] },
    { contents: [{ parts: [{ text: 'a'.repeat(8001) }] }] },
    { contents: Array.from({ length: 5 }, () => ({ parts: [{ text: 'a'.repeat(8000) }] })) },
    { contents: [{ parts: [{ inlineData: { mimeType: 'application/pdf', data: 'aGVsbG8=' } }] }] },
    { contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'não é base64' } }] }] },
    { contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'aGVsbG8=' } }, { inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } }] }] },
    { contents: [{ parts: [{ fileData: { fileUri: 'gs://x' } }] }] },
    { ...connectionTestBody, generationConfig: { maxOutputTokens: 100_000 } },
    { ...connectionTestBody, generationConfig: { temperature: 2 } },
    { ...connectionTestBody, generationConfig: { candidateCount: 8 } },
    { ...connectionTestBody, systemInstruction: { parts: [{ text: 'a'.repeat(2001) }] } },
    null,
  ];
  for (const body of cases) assert.ok(buildGeminiRequest(body).error, JSON.stringify(body)?.slice(0, 80));
});

test('rota de IA envia ao Gemini só o corpo validado e aplica limites', async () => {
  const sent = [];
  let releaseSlow;
  const generateContent = async (body) => {
    sent.push(body);
    if (body.contents[0].parts[0].text === 'lento') await new Promise(resolve => { releaseSlow = resolve; });
    return { candidates: [{ content: { parts: [{ text: 'OK' }] } }] };
  };
  const pool = fakePool(() => undefined, { 'token-a': { id: 'user-a' }, 'token-b': { id: 'user-b' } });
  const app = createApp({ pool, generateContent, limits: { aiWindow: { limit: 3, windowMs: 60_000 }, aiConcurrent: 1 } });
  const { call, close } = await startServer(app);
  try {
    assert.equal((await call('POST', '/api/ai/generate', { body: connectionTestBody })).status, 401);

    const invalid = await call('POST', '/api/ai/generate', { token: 'token-a', body: { ...chatBody, tools: [] } });
    assert.equal(invalid.status, 400);
    assert.equal(sent.length, 0, 'pedido inválido não chega ao Gemini');

    const slow = call('POST', '/api/ai/generate', { token: 'token-a', body: { contents: [{ parts: [{ text: 'lento' }] }] } });
    while (!releaseSlow) await new Promise(resolve => setImmediate(resolve));
    const concurrent = await call('POST', '/api/ai/generate', { token: 'token-a', body: connectionTestBody });
    assert.equal(concurrent.status, 429);
    assert.equal(concurrent.body.code, 'RATE_LIMIT');
    assert.equal((await call('POST', '/api/ai/generate', { token: 'token-b', body: connectionTestBody })).status, 200, 'outro usuário não é afetado');
    releaseSlow();
    assert.equal((await slow).status, 200);

    const windowExceeded = await call('POST', '/api/ai/generate', { token: 'token-a', body: connectionTestBody });
    assert.equal(windowExceeded.status, 429);
    assert.ok(Number(windowExceeded.headers.get('retry-after')) > 0);
    assert.deepEqual(sent.at(-1), connectionTestBody);
  } finally {
    await close();
  }
});
