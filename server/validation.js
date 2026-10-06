// Validação das gravações feitas pelo app. Os limites seguem o schema.sql e
// aceitam os formatos enviados pelos APKs já distribuídos.

const MEAL_TYPES = Object.freeze(['Café da manhã', 'Almoço', 'Jantar', 'Lanche']);
const MAX_MACRO = 20_000;
const MAX_ITEMS = 50;
const MAX_WATER_CHANGE = 5_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const finiteNumber = (value) => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
const chars = (value) => Array.from(value).length;

function validateMacros(source, label) {
  const values = {};
  for (const field of ['calories', 'protein', 'carbs', 'fat']) {
    if (!finiteNumber(source[field])) return { error: `${label}: ${field} deve ser um número.` };
    const value = Number(source[field]);
    if (value < 0 || value > MAX_MACRO) return { error: `${label}: ${field} deve estar entre 0 e ${MAX_MACRO}.` };
    values[field] = value;
  }
  return { values };
}

function validateMealId(id) {
  return typeof id === 'string' && id.length >= 1 && id.length <= 100 && !/[\s/\\]/.test(id);
}

function validateMeal(body, { now = Date.now() } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Refeição inválida.' };
  if (!validateMealId(body.id)) return { error: 'Identificador de refeição inválido.' };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || chars(name) > 180) return { error: 'O nome da refeição deve ter entre 1 e 180 caracteres.' };
  if (!MEAL_TYPES.includes(body.type)) return { error: 'Tipo de refeição inválido.' };

  const macros = validateMacros(body, 'Refeição');
  if (macros.error) return macros;
  if (!finiteNumber(body.portions) || Number(body.portions) <= 0 || Number(body.portions) > 50) return { error: 'Informe uma quantidade de porções entre 0 e 50.' };
  const confidence = body.confidence === undefined ? 100 : Number(body.confidence);
  if (!finiteNumber(confidence) || confidence < 0 || confidence > 100) return { error: 'A confiança deve estar entre 0 e 100.' };

  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : '🍽️';
  if (chars(emoji) > 16) return { error: 'Emoji inválido.' };
  const insights = body.insights === undefined || body.insights === null || body.insights === '' ? null : String(body.insights);
  if (insights && insights.length > 2_000) return { error: 'As observações devem ter até 2000 caracteres.' };

  let consumedAt = null;
  if (body.consumedAt !== undefined && body.consumedAt !== null) {
    const date = new Date(String(body.consumedAt));
    if (Number.isNaN(date.getTime()) || date.getTime() > now + DAY_MS || date.getUTCFullYear() < 2000) {
      return { error: 'Data da refeição inválida.' };
    }
    consumedAt = date.toISOString();
  }

  const rawItems = body.items === undefined ? [] : body.items;
  if (!Array.isArray(rawItems) || rawItems.length > MAX_ITEMS) return { error: `A refeição pode ter até ${MAX_ITEMS} itens.` };
  const items = [];
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') return { error: 'Item da refeição inválido.' };
    const itemName = typeof item.name === 'string' ? item.name.trim() : '';
    if (!itemName || chars(itemName) > 180) return { error: 'Cada item precisa de um nome com até 180 caracteres.' };
    const amount = item.amount === undefined || item.amount === null ? '' : String(item.amount).trim();
    if (chars(amount) > 80) return { error: 'A quantidade de cada item deve ter até 80 caracteres.' };
    const itemMacros = validateMacros(item, `Item "${itemName}"`);
    if (itemMacros.error) return itemMacros;
    items.push({ name: itemName, amount, ...itemMacros.values });
  }

  return {
    meal: {
      id: body.id, name, type: body.type, ...macros.values,
      portions: Number(body.portions), emoji, confidence, insights, consumedAt, items,
    },
  };
}

function validateWaterChange(body) {
  const amount = body?.amount;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_WATER_CHANGE) {
    return { error: `Informe uma quantidade de água inteira, diferente de zero e de até ${MAX_WATER_CHANGE} ml.` };
  }
  return { amount };
}

// Mesmo critério de /api/state: o app envia os limites do dia no fuso do aparelho.
// APKs antigos não enviam e usam o dia do servidor.
function dayBounds(dayStart, dayEnd, now = new Date()) {
  const start = new Date(String(dayStart || ''));
  const end = new Date(String(dayEnd || ''));
  const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
    && end > start && end.getTime() - start.getTime() <= 27 * 60 * 60 * 1000;
  if (valid) return { dayStart: start, dayEnd: end };
  const fallbackStart = new Date(now);
  fallbackStart.setHours(0, 0, 0, 0);
  const fallbackEnd = new Date(fallbackStart);
  fallbackEnd.setDate(fallbackEnd.getDate() + 1);
  return { dayStart: fallbackStart, dayEnd: fallbackEnd };
}

const GOAL_RANGES = Object.freeze({
  calories: { min: 500, max: 10_000, integer: true },
  protein: { min: 0, max: 2_000 },
  carbs: { min: 0, max: 2_000 },
  fat: { min: 0, max: 2_000 },
  water: { min: 250, max: 10_000, integer: true },
});

function validateGoals(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Metas inválidas.' };
  const goals = {};
  for (const [field, range] of Object.entries(GOAL_RANGES)) {
    if (body[field] === undefined || body[field] === null) continue;
    const value = body[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || (range.integer && !Number.isInteger(value))
      || value < range.min || value > range.max) {
      return { error: `A meta de ${field} deve estar entre ${range.min} e ${range.max}.` };
    }
    goals[field] = value;
  }
  return { goals };
}

module.exports = { MEAL_TYPES, validateMeal, validateMealId, validateWaterChange, validateGoals, dayBounds };
