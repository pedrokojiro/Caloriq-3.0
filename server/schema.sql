BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  weight NUMERIC(6,2) NOT NULL CHECK (weight > 0),
  avatar_text VARCHAR(4) NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL CHECK (calories > 0),
  protein NUMERIC(7,2) NOT NULL CHECK (protein >= 0),
  carbs NUMERIC(7,2) NOT NULL CHECK (carbs >= 0),
  fat NUMERIC(7,2) NOT NULL CHECK (fat >= 0),
  water INTEGER NOT NULL CHECK (water > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('Café da manhã', 'Almoço', 'Jantar', 'Lanche')),
  calories NUMERIC(9,2) NOT NULL CHECK (calories >= 0),
  protein NUMERIC(9,2) NOT NULL CHECK (protein >= 0),
  carbs NUMERIC(9,2) NOT NULL CHECK (carbs >= 0),
  fat NUMERIC(9,2) NOT NULL CHECK (fat >= 0),
  portions NUMERIC(7,2) NOT NULL CHECK (portions > 0),
  emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  insights TEXT,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meals_user_consumed_idx ON meals(user_id, consumed_at DESC);

CREATE TABLE IF NOT EXISTS meal_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  amount VARCHAR(80) NOT NULL,
  calories NUMERIC(9,2) NOT NULL CHECK (calories >= 0),
  protein NUMERIC(9,2) NOT NULL CHECK (protein >= 0),
  carbs NUMERIC(9,2) NOT NULL CHECK (carbs >= 0),
  fat NUMERIC(9,2) NOT NULL CHECK (fat >= 0)
);

CREATE TABLE IF NOT EXISTS water_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS water_user_consumed_idx ON water_entries(user_id, consumed_at DESC);

INSERT INTO users (id, name, weight, avatar_text, streak)
VALUES ('local-user', 'Pedro', 78, 'P', 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_goals (user_id, calories, protein, carbs, fat, water)
VALUES ('local-user', 2000, 150, 200, 65, 2500)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO meals (id, user_id, name, type, calories, protein, carbs, fat, portions, emoji, confidence, consumed_at)
VALUES
  ('meal-1', 'local-user', 'Panqueca de Aveia e Whey', 'Café da manhã', 410, 30, 45, 10, 1, '🥞', 96, CURRENT_DATE + TIME '08:15'),
  ('meal-2', 'local-user', 'Salada com Frango Grelhado', 'Almoço', 480, 42, 18, 12, 1.2, '🥗', 94, CURRENT_DATE + TIME '12:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO meal_items (id, meal_id, name, amount, calories, protein, carbs, fat)
VALUES
  ('item-1', 'meal-1', 'Whey Protein', '30g', 120, 24, 3, 1),
  ('item-2', 'meal-1', 'Farinha de Aveia', '50g', 190, 6, 32, 4),
  ('item-3', 'meal-1', 'Banana Prata', '1 unidade', 100, 1, 25, 0),
  ('item-4', 'meal-2', 'Peito de Frango Grelhado', '150g', 220, 35, 0, 8),
  ('item-5', 'meal-2', 'Mix de Folhas Verdes', '100g', 20, 1, 4, 0),
  ('item-6', 'meal-2', 'Azeite de Oliva Extra Virgem', '1 colher de sopa', 140, 0, 0, 15),
  ('item-7', 'meal-2', 'Cenoura Ralada', '50g', 20, 0.5, 5, 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;
