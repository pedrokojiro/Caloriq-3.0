// Geração dos arquivos do relatório alimentar (CSV e HTML para PDF).
// Funções puras: recebem os dados de /api/reports e devolvem texto.

export type ReportPeriod = 'week' | 'month' | 'threeMonths';

export interface ReportMacros { calories: number; protein: number; carbs: number; fat: number }
export interface ReportItem extends ReportMacros { name: string; amount: string }
export interface ReportMeal extends ReportMacros { date: string; time: string; type: string; name: string; portions: number; items: ReportItem[] }
export interface ReportDay extends ReportMacros { date: string; meals: number }
export interface ReportData {
  from: string; to: string; timeZone: string; generatedAt: string;
  goals: (ReportMacros & { water: number }) | null;
  summary: { daysWithMeals: number; meals: number; averages: ReportMacros; daysWithinGoal: number };
  days: ReportDay[];
  meals: ReportMeal[];
}

export const PERIOD_LABELS: Record<ReportPeriod, string> = { week: 'Últimos 7 dias', month: 'Mês atual', threeMonths: 'Últimos 3 meses' };

// Mesmos períodos da tela de Analytics, em horário local.
export function reportRange(period: ReportPeriod, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const from = period === 'week'
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    : period === 'month'
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth() - 2, 1);
  return { from, to };
}

const decimal = (value: number) => (Math.round(value * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const whole = (value: number) => Math.round(value).toLocaleString('pt-BR');
const brDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const weekday = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); };

function csvCell(value: string | number) {
  const text = typeof value === 'number' ? decimal(value) : value;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// CSV no padrão do Excel em português: ";" como separador, vírgula decimal e BOM UTF-8.
export function buildReportCsv(report: ReportData) {
  const header = ['Data', 'Hora', 'Tipo', 'Refeição', 'Porções', 'Calorias (kcal)', 'Proteína (g)', 'Carboidratos (g)', 'Gordura (g)', 'Itens'];
  const rows = report.meals.map(meal => [
    brDate(meal.date), meal.time, meal.type, meal.name, meal.portions, meal.calories, meal.protein, meal.carbs, meal.fat,
    meal.items.map(item => (item.amount ? `${item.name} (${item.amount})` : item.name)).join(', '),
  ]);
  return '﻿' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string));

function goalStatus(calories: number, goal?: number) {
  if (!goal) return '';
  if (calories >= goal * 0.9 && calories <= goal * 1.1) return '<span class="ok">Na meta</span>';
  return calories < goal ? '<span class="low">Abaixo</span>' : '<span class="high">Acima</span>';
}

export function buildReportHtml(report: ReportData, options: { userName: string; periodLabel: string }) {
  const goals = report.goals;
  const lastDay = new Date(new Date(report.to).getTime() - 1);
  const range = `${new Date(report.from).toLocaleDateString('pt-BR')} a ${lastDay.toLocaleDateString('pt-BR')}`;
  const avg = report.summary.averages;
  const card = (label: string, value: string, sub = '') => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  const dayRows = report.days.map(day => `<tr><td>${weekday(day.date)} ${brDate(day.date)}</td><td class="n">${day.meals}</td><td class="n">${whole(day.calories)}</td><td class="n">${decimal(day.protein)}</td><td class="n">${decimal(day.carbs)}</td><td class="n">${decimal(day.fat)}</td><td>${goalStatus(day.calories, goals?.calories)}</td></tr>`).join('');
  const mealsByDay = report.days.map(day => {
    const meals = report.meals.filter(meal => meal.date === day.date).map(meal => `<tr><td class="time">${meal.time}</td><td><strong>${escapeHtml(meal.name)}</strong><div class="muted">${escapeHtml(meal.type)}${meal.portions !== 1 ? ` · ${decimal(meal.portions)} porções` : ''}${meal.items.length ? ` · ${escapeHtml(meal.items.map(item => item.name).join(', '))}` : ''}</div></td><td class="n">${whole(meal.calories)}</td><td class="n">${decimal(meal.protein)}</td><td class="n">${decimal(meal.carbs)}</td><td class="n">${decimal(meal.fat)}</td></tr>`).join('');
    return `<h3>${weekday(day.date)}, ${brDate(day.date)}</h3><table><thead><tr><th>Hora</th><th>Refeição</th><th class="n">kcal</th><th class="n">P (g)</th><th class="n">C (g)</th><th class="n">G (g)</th></tr></thead><tbody>${meals}</tbody></table>`;
  }).join('');
  const empty = '<p class="empty">Nenhuma refeição registrada neste período.</p>';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório alimentar CaloriQ</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    body { font-family: Roboto, Arial, sans-serif; color: #0D1117; font-size: 11pt; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #13804A; padding-bottom: 10px; margin-bottom: 16px; }
    .brand { color: #0E7A3E; font-weight: 800; letter-spacing: 1.5px; font-size: 10pt; }
    h1 { font-size: 20pt; margin: 4px 0 0; } h2 { font-size: 13pt; margin: 22px 0 8px; } h3 { font-size: 11pt; margin: 16px 0 6px; color: #0E7A3E; }
    .meta { text-align: right; color: #4A5565; font-size: 10pt; line-height: 1.5; }
    .cards { display: flex; gap: 10px; flex-wrap: wrap; }
    .card { flex: 1 1 120px; border: 1px solid #E3E7EA; border-radius: 10px; padding: 10px 12px; }
    .label { color: #4A5565; font-size: 9pt; } .value { font-size: 16pt; font-weight: 800; margin-top: 2px; } .sub { color: #5F6B7A; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; } tr { page-break-inside: avoid; }
    th, td { text-align: left; padding: 6px 6px; border-bottom: 1px solid #E3E7EA; vertical-align: top; font-size: 10pt; }
    th { color: #4A5565; font-size: 9pt; font-weight: 700; } .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .time { width: 44px; color: #4A5565; } .muted { color: #5F6B7A; font-size: 9pt; margin-top: 2px; }
    .ok { color: #0E7A3E; font-weight: 700; } .low { color: #A15C07; font-weight: 700; } .high { color: #C4320A; font-weight: 700; }
    .empty { color: #4A5565; } footer { margin-top: 24px; color: #5F6B7A; font-size: 8.5pt; border-top: 1px solid #E3E7EA; padding-top: 8px; }
  </style></head><body>
    <header><div><div class="brand">CALORIQ</div><h1>Relatório alimentar</h1></div>
      <div class="meta">${escapeHtml(options.userName)}<br>${escapeHtml(options.periodLabel)} · ${range}</div></header>
    <div class="cards">
      ${card('Média diária', `${whole(avg.calories)} kcal`, goals ? `meta ${whole(goals.calories)} kcal` : '')}
      ${card('Dias registrados', String(report.summary.daysWithMeals), `${report.summary.meals} refeições`)}
      ${card('Dias na meta', goals ? `${report.summary.daysWithinGoal}/${report.summary.daysWithMeals}` : '—', 'entre 90% e 110% da meta')}
      ${card('Macros médios', `${decimal(avg.protein)} / ${decimal(avg.carbs)} / ${decimal(avg.fat)} g`, goals ? `meta ${whole(goals.protein)} / ${whole(goals.carbs)} / ${whole(goals.fat)} g (P/C/G)` : 'proteína / carbo / gordura')}
    </div>
    <h2>Resumo por dia</h2>
    ${report.days.length ? `<table><thead><tr><th>Dia</th><th class="n">Refeições</th><th class="n">kcal</th><th class="n">P (g)</th><th class="n">C (g)</th><th class="n">G (g)</th><th>Meta</th></tr></thead><tbody>${dayRows}</tbody></table>` : empty}
    ${report.days.length ? `<h2>Refeições</h2>${mealsByDay}` : ''}
    <footer>Gerado pelo CaloriQ em ${new Date(report.generatedAt).toLocaleString('pt-BR')}. Valores estimados a partir dos registros do usuário; não substituem orientação de nutricionista.</footer>
  </body></html>`;
}

export function reportFileName(period: ReportPeriod, extension: 'csv' | 'pdf', now = new Date()) {
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const slug = { week: '7-dias', month: 'mes', threeMonths: '3-meses' }[period];
  return `caloriq-relatorio-${slug}-${stamp}.${extension}`;
}
