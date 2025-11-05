-- Base Tables for Testing Claude Orchestrator
-- NOTE: In production, these tables would come from your main Luna application
-- This migration is only needed for standalone testing

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Interactions table (call history)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  transcript TEXT,
  duration_seconds INTEGER,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_completed ON interactions(completed_at DESC);

-- Insert a test user
INSERT INTO users (id, name, email, timezone)
VALUES (
  '5899f756-7e21-4ef2-a6f6-9b13e43efba5',
  'Marco (Test User)',
  'test@example.com',
  'America/New_York'
)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON interactions TO authenticated;
