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

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(254);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS calculation_sex VARCHAR(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS objective VARCHAR(16);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation VARCHAR(300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mindset VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

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

-- Remove os registros de demonstração criados pelas versões antigas.
-- Contas e refeições reais usam UUIDs e não são afetadas.
DELETE FROM users WHERE id = 'local-user';

COMMIT;
