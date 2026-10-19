import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportCsv, buildReportHtml, reportFileName, reportRange } from '../../src/utils/report.ts';

const report = {
  from: '2026-10-13T03:00:00.000Z', to: '2026-10-20T03:00:00.000Z', timeZone: 'America/Sao_Paulo', generatedAt: '2026-10-19T20:00:00.000Z',
  goals: { calories: 2000, protein: 120, carbs: 230, fat: 65, water: 2500 },
  summary: { daysWithMeals: 1, meals: 2, averages: { calories: 1120, protein: 78, carbs: 120, fat: 30.5 }, daysWithinGoal: 0 },
  days: [{ date: '2026-10-18', calories: 1120, protein: 78, carbs: 120, fat: 30.5, meals: 2 }],
  meals: [
    { date: '2026-10-18', time: '07:40', type: 'Café da manhã', name: 'Pão; ovo e "café"', portions: 1, calories: 320, protein: 18, carbs: 30, fat: 12.5, items: [] },
    { date: '2026-10-18', time: '12:30', type: 'Almoço', name: '<b>Arroz</b>', portions: 2, calories: 800, protein: 60, carbs: 90, fat: 18, items: [{ name: 'Arroz', amount: '150 g', calories: 200, protein: 4, carbs: 44, fat: 1 }] },
  ],
};

test('CSV usa ponto e vírgula, vírgula decimal, BOM e escapa campos', () => {
  const csv = buildReportCsv(report);
  assert.ok(csv.startsWith('﻿Data;Hora;Tipo;Refeição'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[1], '18/10/2026;07:40;Café da manhã;"Pão; ovo e ""café""";1;320;18;30;12,5;');
  assert.match(lines[2], /;2;800;60;90;18;Arroz \(150 g\)$/);
});

test('HTML do PDF escapa nomes e mostra resumo e status da meta', () => {
  const html = buildReportHtml(report, { userName: 'Ana <script>', periodLabel: 'Últimos 7 dias' });
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('&lt;b&gt;Arroz&lt;/b&gt;'));
  assert.ok(html.includes('13/10/2026 a 19/10/2026'), 'o último dia é o anterior ao limite exclusivo');
  assert.ok(html.includes('1.120 kcal'));
  assert.ok(html.includes('class="low">Abaixo'));
  const empty = buildReportHtml({ ...report, days: [], meals: [], summary: { ...report.summary, daysWithMeals: 0, meals: 0 } }, { userName: 'Ana', periodLabel: 'Mês atual' });
  assert.ok(empty.includes('Nenhuma refeição registrada neste período.'));
});

test('períodos e nome do arquivo seguem o Analytics', () => {
  const now = new Date(2026, 9, 19, 15, 0);
  const week = reportRange('week', now);
  assert.equal(week.from.getDate(), 13);
  assert.equal(week.to.getDate(), 20);
  assert.equal(reportRange('month', now).from.getDate(), 1);
  assert.equal(reportRange('threeMonths', now).from.getMonth(), 7);
  assert.equal(reportFileName('threeMonths', 'pdf', now), 'caloriq-relatorio-3-meses-2026-10-19.pdf');
});
