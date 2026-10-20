const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail, validEmail, hashPassword, verifyPassword, createSessionToken, hashToken } = require('./auth');

test('normaliza e valida e-mail', () => {
  assert.equal(normalizeEmail('  Pedro@Email.COM '), 'pedro@email.com');
  assert.equal(validEmail('pedro@email.com'), true);
  assert.equal(validEmail('email-invalido'), false);
});

test('senha é armazenada como hash com salt', async () => {
  const first = await hashPassword('senha-segura');
  const second = await hashPassword('senha-segura');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('senha-segura', first), true);
  assert.equal(await verifyPassword('senha-errada', first), false);
  assert.equal(first.includes('senha-segura'), false);
});

test('verifica hashes gravados pela versão síncrona anterior', async () => {
  const { scryptSync } = require('node:crypto');
  const legacy = `abcd:${scryptSync('senha-antiga', 'abcd', 64).toString('hex')}`;
  assert.equal(await verifyPassword('senha-antiga', legacy), true);
});

test('usuário inexistente nunca autentica', async () => {
  assert.equal(await verifyPassword('qualquer', undefined), false);
  assert.equal(await verifyPassword('', null), false);
});

test('token de sessão não é armazenado em texto puro', () => {
  const token = createSessionToken();
  assert.ok(token.length >= 40);
  assert.equal(hashToken(token).length, 64);
  assert.notEqual(hashToken(token), token);
});
