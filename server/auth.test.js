const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail, validEmail, hashPassword, verifyPassword, createSessionToken, hashToken } = require('./auth');

test('normaliza e valida e-mail', () => {
  assert.equal(normalizeEmail('  Pedro@Email.COM '), 'pedro@email.com');
  assert.equal(validEmail('pedro@email.com'), true);
  assert.equal(validEmail('email-invalido'), false);
});

test('senha é armazenada como hash com salt', () => {
  const first = hashPassword('senha-segura');
  const second = hashPassword('senha-segura');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('senha-segura', first), true);
  assert.equal(verifyPassword('senha-errada', first), false);
  assert.equal(first.includes('senha-segura'), false);
});

test('token de sessão não é armazenado em texto puro', () => {
  const token = createSessionToken();
  assert.ok(token.length >= 40);
  assert.equal(hashToken(token).length, 64);
  assert.notEqual(hashToken(token), token);
});
