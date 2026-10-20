import type { Meal, NutritionGoals } from '../types';

// Funções puras usadas para desfazer apenas a operação otimista que falhou,
// sem sobrescrever mudanças feitas depois dela.

export function removeOptimisticMeal(meals: Meal[], optimistic: Meal): Meal[] {
  return meals.includes(optimistic) ? meals.filter(meal => meal !== optimistic) : meals;
}

export function revertMealUpdate(meals: Meal[], optimistic: Meal, previous: Meal): Meal[] {
  return meals.includes(optimistic) ? meals.map(meal => (meal === optimistic ? previous : meal)) : meals;
}

const consumedTime = (meal: Meal) => (meal.consumedAt ? new Date(meal.consumedAt).getTime() : Number.NaN);

export function restoreDeletedMeal(meals: Meal[], removed: Meal, originalIndex: number): Meal[] {
  if (meals.some(meal => meal.id === removed.id)) return meals;
  const removedTime = consumedTime(removed);
  let index = Number.isFinite(removedTime)
    ? meals.findIndex(meal => !(consumedTime(meal) >= removedTime))
    : Math.min(Math.max(originalIndex, 0), meals.length);
  if (index < 0) index = meals.length;
  return [...meals.slice(0, index), removed, ...meals.slice(index)];
}

export function revertGoals(current: NutritionGoals, previous: NutritionGoals, applied: Partial<NutritionGoals>): NutritionGoals {
  let changed = false;
  const next = { ...current };
  for (const key of Object.keys(applied) as (keyof NutritionGoals)[]) {
    if (applied[key] !== undefined && current[key] === applied[key]) {
      next[key] = previous[key];
      changed = true;
    }
  }
  return changed ? next : current;
}

export function revertWater(current: number, delta: number): number {
  return Math.max(0, current - delta);
}

// Coordena o carregamento do servidor com as gravações otimistas em andamento:
// uma resposta que chega depois de uma gravação começar ou terminar está
// desatualizada e é descartada em favor de um novo carregamento.
export class SyncTracker {
  private version = 0;
  private pending = 0;
  private reloadAfterPending = false;
  epoch = 0;

  reset() {
    this.epoch += 1;
    this.version += 1;
    this.pending = 0;
    this.reloadAfterPending = false;
  }

  isCurrent(epoch: number) {
    return epoch === this.epoch;
  }

  beginMutation() {
    this.version += 1;
    this.pending += 1;
    return this.epoch;
  }

  // Retorna true quando um carregamento adiado deve ser feito agora.
  settleMutation(epoch: number) {
    if (!this.isCurrent(epoch)) return false;
    this.version += 1;
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0 && this.reloadAfterPending) {
      this.reloadAfterPending = false;
      return true;
    }
    return false;
  }

  startFetch() {
    return { epoch: this.epoch, version: this.version };
  }

  resolveFetch(ticket: { epoch: number; version: number }): 'apply' | 'reload' | 'discard' {
    if (!this.isCurrent(ticket.epoch)) return 'discard';
    if (this.pending > 0) {
      this.reloadAfterPending = true;
      return 'discard';
    }
    return ticket.version === this.version ? 'apply' : 'reload';
  }
}
