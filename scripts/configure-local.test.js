const test = require('node:test');
const assert = require('node:assert/strict');
const dotenv = require('dotenv');
const { replaceSetting, connectionUrl } = require('./configure-local');

test('preserves unrelated settings and replaces duplicates without leaking old values', () => {
  const result = replaceSetting('OTHER=keep\nDATABASE_URL=old\nDATABASE_URL=duplicate\n', 'DATABASE_URL', 'new');
  assert.equal(dotenv.parse(result).OTHER, 'keep');
  assert.equal(dotenv.parse(result).DATABASE_URL, 'new');
  assert.equal(result.includes('old'), false);
  assert.equal((result.match(/DATABASE_URL=/g) || []).length, 1);
});
test('encodes special password characters for PostgreSQL and dotenv', () => {
  const url = connectionUrl('postgres', 'test@:# $/=senha', '5432', 'caloriq');
  const result = dotenv.parse(replaceSetting('', 'DATABASE_URL', url));
  assert.equal(decodeURIComponent(new URL(result.DATABASE_URL).password), 'test@:# $/=senha');
});
test('rejects invalid ports, database names and newline injection', () => {
  assert.throws(() => connectionUrl('postgres', 'test', '0', 'caloriq'));
  assert.throws(() => connectionUrl('postgres', 'test', '5432', 'invalid name'));
  assert.throws(() => replaceSetting('', 'DATABASE_URL', 'one\nTWO=bad'));
});
