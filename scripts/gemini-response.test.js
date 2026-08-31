const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/services/gemini-response.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { readGeminiText, plainChatText } = context.exports;
test('joins text parts and omits thoughts', () => {
  assert.equal(readGeminiText({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'hidden', thought: true }, { text: 'Uma fatia ' }, { text: 'depende do tamanho.' }] } }] }), 'Uma fatia depende do tamanho.');
});
test('rejects truncated, blocked and empty responses', () => {
  for (const finishReason of ['MAX_TOKENS', 'SAFETY']) assert.throws(() => readGeminiText({ candidates: [{ finishReason, content: { parts: [{ text: 'fragmento' }] } }] }));
  assert.throws(() => readGeminiText({}));
});
test('cleans basic markdown without losing nutritional text', () => {
  assert.equal(plainChatText('**Por fatia**\n* estimativa\n*Pizza inteira*'), 'Por fatia\n• estimativa\nPizza inteira');
});
test('image truncation explains that demo is not analysis and does not ask a shorter question', () => {
  assert.throws(() => readGeminiText({ candidates: [{ finishReason: 'MAX_TOKENS' }] }, 'image'), error => {
    assert.match(error.message, /análise da foto/);
    assert.match(error.message, /demonstração não analisa/);
    assert.doesNotMatch(error.message, /pergunta mais curta/);
    return true;
  });
});
