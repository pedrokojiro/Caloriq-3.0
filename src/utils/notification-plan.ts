// Planeja os lembretes dos próximos dias como notificações avulsas, em vez de
// repetições fixas. Assim dá para pular o que já foi feito hoje e respeitar o
// horário de silêncio da hidratação. O app refaz o plano sempre que abre ou
// quando algo é registrado.

export type MealReminderKey = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type WaterInterval = 1 | 2 | 3;

export interface PlanPreferences {
  journal: boolean;
  streak: boolean;
  weeklyReport: boolean;
  aiInsights: boolean;
  water: boolean;
  waterIntervalHours: WaterInterval;
  mealReminders: Record<MealReminderKey, { enabled: boolean; time: string | null }>;
}

export interface TodayStatus { mealTypes: string[]; waterIntake: number; waterGoal: number }

// Resumo do dia atual a partir do estado do app (refeições de hoje e água).
export function buildTodayStatus(meals: { type: string; consumedAt?: string }[], waterIntake: number, waterGoal: number, now = new Date()): TodayStatus {
  const sameDay = (iso?: string) => {
    if (!iso) return false;
    const date = new Date(iso);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };
  return { mealTypes: [...new Set(meals.filter(meal => sameDay(meal.consumedAt)).map(meal => meal.type))].sort(), waterIntake, waterGoal };
}

export interface PlannedNotification { kind: string; date: Date; title: string; body: string; url: string }

export const PLAN_DAYS = 7;
export const WATER_WINDOW = { start: 8, end: 21 } as const;

const MEAL_TYPE: Record<MealReminderKey, string> = { breakfast: 'Café da manhã', lunch: 'Almoço', snack: 'Lanche', dinner: 'Jantar' };
const MEAL_CONTENT: Record<MealReminderKey, { title: string; body: string }> = {
  breakfast: { title: 'Café da manhã ☀️', body: 'Registre seu café da manhã e comece o dia acompanhando suas metas.' },
  lunch: { title: 'Hora do almoço 🍽️', body: 'Fotografe seu prato para registrar o almoço em segundos.' },
  snack: { title: 'Lanche da tarde 🍎', body: 'Que tal registrar seu lanche e acompanhar os nutrientes?' },
  dinner: { title: 'Hora do jantar 🌙', body: 'Registre o jantar para completar seu diário de hoje.' },
};

const at = (base: Date, dayOffset: number, hour: number, minute = 0) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0);

const litres = (ml: number) => (Math.max(0, ml) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function planNotifications(prefs: PlanPreferences, now: Date, today: TodayStatus | null, days = PLAN_DAYS): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  const loggedToday = new Set(today?.mealTypes ?? []);
  const add = (item: PlannedNotification) => { if (item.date.getTime() > now.getTime()) plan.push(item); };

  for (let day = 0; day < days; day += 1) {
    const isToday = day === 0;

    for (const key of Object.keys(prefs.mealReminders) as MealReminderKey[]) {
      const reminder = prefs.mealReminders[key];
      if (!reminder.enabled || !reminder.time) continue;
      if (isToday && loggedToday.has(MEAL_TYPE[key])) continue;
      const [hour, minute] = reminder.time.split(':').map(Number);
      add({ kind: `meal-${key}`, date: at(now, day, hour, minute), ...MEAL_CONTENT[key], url: '/(tabs)/scanner' });
    }

    if (prefs.water && !(isToday && today && today.waterGoal > 0 && today.waterIntake >= today.waterGoal)) {
      const remaining = isToday && today && today.waterGoal > 0 ? today.waterGoal - today.waterIntake : null;
      for (let hour = WATER_WINDOW.start; hour < WATER_WINDOW.end; hour += prefs.waterIntervalHours) {
        add({
          kind: 'water', date: at(now, day, hour), title: 'Hora de se hidratar 💧',
          body: remaining !== null ? `Faltam ${litres(remaining)} L para sua meta de hoje.` : 'Um copo de água agora ajuda você a manter sua meta do dia.',
          url: '/(tabs)',
        });
      }
    }

    if (prefs.journal && !(isToday && loggedToday.has('Jantar'))) {
      add({ kind: 'journal', date: at(now, day, 21), title: 'Seu diário está completo? 📝', body: 'Confira se todas as refeições de hoje foram registradas.', url: '/(tabs)' });
    }
    if (prefs.streak && !(isToday && loggedToday.size > 0)) {
      add({ kind: 'streak', date: at(now, day, 21, 30), title: 'Mantenha sua sequência 🔥', body: 'Registre uma refeição de hoje para não perder sua sequência.', url: '/(tabs)/scanner' });
    }
    if (prefs.aiInsights) {
      add({ kind: 'ai-insight', date: at(now, day, 10), title: 'Insight do CaloriQ IA 🤖', body: 'Veja como suas escolhas estão contribuindo para suas metas.', url: '/(modals)/ai-chat' });
    }
    if (prefs.weeklyReport && at(now, day, 18).getDay() === 0) {
      add({ kind: 'weekly-report', date: at(now, day, 18), title: 'Seu resumo semanal está pronto 📊', body: 'Confira calorias, macros e sua evolução da semana.', url: '/(tabs)/analytics' });
    }
  }
  return plan.sort((a, b) => a.date.getTime() - b.date.getTime());
}
