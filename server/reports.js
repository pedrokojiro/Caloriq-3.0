// Dados do relatório alimentar: totais por dia e refeições do período, já com
// as porções aplicadas e as datas no fuso do aparelho.
const { historyRange } = require('./validation');

const number = (value) => Math.round(Number(value) * 10) / 10;

function registerReports(app, { pool }) {
  app.get('/api/reports', async (request, response, next) => {
    const range = historyRange(request.query);
    if (range.error) return response.status(400).json({ error: range.error });
    const { from, to, timeZone } = range;
    try {
      const [goals, meals, items] = await Promise.all([
        pool.query('SELECT calories, protein, carbs, fat, water FROM nutrition_goals WHERE user_id = $1', [request.userId]),
        pool.query(
          `SELECT id, name, type, portions, calories, protein, carbs, fat,
             to_char(consumed_at AT TIME ZONE $4, 'YYYY-MM-DD') AS day,
             to_char(consumed_at AT TIME ZONE $4, 'HH24:MI') AS time
           FROM meals WHERE user_id = $1 AND consumed_at >= $2 AND consumed_at < $3
           ORDER BY consumed_at`,
          [request.userId, from, to, timeZone]
        ),
        pool.query(
          `SELECT mi.meal_id, mi.name, mi.amount, mi.calories, mi.protein, mi.carbs, mi.fat
           FROM meal_items mi JOIN meals m ON m.id = mi.meal_id
           WHERE m.user_id = $1 AND m.consumed_at >= $2 AND m.consumed_at < $3`,
          [request.userId, from, to]
        ),
      ]);
      const itemsByMeal = new Map();
      for (const item of items.rows) {
        if (!itemsByMeal.has(item.meal_id)) itemsByMeal.set(item.meal_id, []);
        itemsByMeal.get(item.meal_id).push({ name: item.name, amount: item.amount, calories: number(item.calories), protein: number(item.protein), carbs: number(item.carbs), fat: number(item.fat) });
      }
      const days = new Map();
      const reportMeals = meals.rows.map(meal => {
        const portions = Number(meal.portions) || 1;
        const totals = {
          calories: number(meal.calories * portions), protein: number(meal.protein * portions),
          carbs: number(meal.carbs * portions), fat: number(meal.fat * portions),
        };
        const day = days.get(meal.day) || { date: meal.day, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
        for (const key of ['calories', 'protein', 'carbs', 'fat']) day[key] = number(day[key] + totals[key]);
        day.meals += 1;
        days.set(meal.day, day);
        return { date: meal.day, time: meal.time, type: meal.type, name: meal.name, portions, ...totals, items: itemsByMeal.get(meal.id) || [] };
      });
      const dayList = [...days.values()];
      const average = key => (dayList.length ? number(dayList.reduce((sum, day) => sum + day[key], 0) / dayList.length) : 0);
      const goal = goals.rows[0];
      response.set('Cache-Control', 'no-store');
      response.json({
        from: from.toISOString(), to: to.toISOString(), timeZone, generatedAt: new Date().toISOString(),
        goals: goal ? { calories: Number(goal.calories), protein: number(goal.protein), carbs: number(goal.carbs), fat: number(goal.fat), water: Number(goal.water) } : null,
        summary: {
          daysWithMeals: dayList.length, meals: reportMeals.length,
          averages: { calories: average('calories'), protein: average('protein'), carbs: average('carbs'), fat: average('fat') },
          daysWithinGoal: goal ? dayList.filter(day => day.calories >= goal.calories * 0.9 && day.calories <= goal.calories * 1.1).length : 0,
        },
        days: dayList,
        meals: reportMeals,
      });
    } catch (error) { next(error); }
  });
}

module.exports = { registerReports };
