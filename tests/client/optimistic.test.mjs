import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SyncTracker, removeOptimisticMeal, restoreDeletedMeal, revertGoals, revertMealUpdate, revertWater,
} from '../../src/utils/optimistic.ts';

const meal = (id, consumedAt, extra = {}) => ({ id, name: id, consumedAt, ...extra });

test('falha ao criar remove só a refeição otimista', () => {
  const optimistic = meal('nova', '2026-10-06T12:00:00Z');
  const other = meal('outra', '2026-10-06T11:00:00Z');
  assert.deepEqual(removeOptimisticMeal([optimistic, other], optimistic), [other]);
  const editedLater = { ...optimistic, name: 'editada' };
  const state = [editedLater, other];
  assert.equal(removeOptimisticMeal(state, optimistic), state, 'não remove versão editada depois');
});

test('falha ao editar restaura a versão anterior só se nada mais mudou', () => {
  const previous = meal('m', '2026-10-06T12:00:00Z', { name: 'antes' });
  const optimistic = { ...previous, name: 'depois' };
  assert.deepEqual(revertMealUpdate([optimistic], optimistic, previous), [previous]);
  const newer = { ...previous, name: 'edição mais nova' };
  assert.deepEqual(revertMealUpdate([newer], optimistic, previous), [newer]);
});

test('falha ao excluir reinsere na posição cronológica e não duplica', () => {
  const a = meal('a', '2026-10-06T13:00:00Z');
  const b = meal('b', '2026-10-06T12:00:00Z');
  const c = meal('c', '2026-10-06T11:00:00Z');
  assert.deepEqual(restoreDeletedMeal([a, c], b, 1).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(restoreDeletedMeal([a, c], meal('old', '2026-10-05T10:00:00Z'), 0).map(item => item.id), ['a', 'c', 'old']);
  assert.deepEqual(restoreDeletedMeal([a, b, c], b, 1).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(restoreDeletedMeal([a, c], meal('sem-data'), 1).map(item => item.id), ['a', 'sem-data', 'c']);
});

test('metas revertem só os campos que ainda têm o valor otimista', () => {
  const previous = { calories: 2000, protein: 150, carbs: 200, fat: 65, water: 2500 };
  const applied = { calories: 2200, water: 3000 };
  const current = { ...previous, ...applied, water: 3200 };
  assert.deepEqual(revertGoals(current, previous, applied), { ...current, calories: 2000 });
});

test('água desfaz só o próprio ajuste, mesmo com cliques concorrentes', () => {
  let water = 0;
  water += 250; // ajuste A
  water += 250; // ajuste B
  water = revertWater(water, 250); // A falhou
  assert.equal(water, 250);
  assert.equal(revertWater(100, 250), 0, 'nunca fica negativo');
  assert.equal(revertWater(250, -250), 500, 'desfaz uma redução');
});

test('carregamento atrasado é descartado enquanto há gravações e recarrega depois', () => {
  const sync = new SyncTracker();
  sync.reset();

  const quiet = sync.startFetch();
  assert.equal(sync.resolveFetch(quiet), 'apply');

  const ticket = sync.startFetch();
  const epoch = sync.beginMutation();
  assert.equal(sync.resolveFetch(ticket), 'discard', 'resposta antiga não sobrescreve gravação pendente');
  assert.equal(sync.settleMutation(epoch), true, 'recarrega quando a gravação termina');

  const beforeMutation = sync.startFetch();
  const epoch2 = sync.beginMutation();
  assert.equal(sync.settleMutation(epoch2), false);
  assert.equal(sync.resolveFetch(beforeMutation), 'reload', 'resposta iniciada antes de uma gravação concluída é refeita');
});

test('respostas e falhas de outra conta são ignoradas após troca de usuário', () => {
  const sync = new SyncTracker();
  sync.reset();
  const ticket = sync.startFetch();
  const epoch = sync.beginMutation();
  sync.reset(); // logout + login de outra conta
  assert.equal(sync.isCurrent(epoch), false);
  assert.equal(sync.resolveFetch(ticket), 'discard');
  assert.equal(sync.settleMutation(epoch), false);
  assert.equal(sync.resolveFetch(sync.startFetch()), 'apply', 'gravação da conta anterior não bloqueia a nova');
});
