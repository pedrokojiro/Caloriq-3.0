// `consumedAt` (ISO em UTC) é a referência de horário das refeições; a exibição
// e os limites do dia são sempre calculados no fuso do aparelho.

export function formatMealTime(consumedAt: string | undefined, fallback = ''): string {
  if (!consumedAt) return fallback;
  const date = new Date(consumedAt);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function localDayBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
}
