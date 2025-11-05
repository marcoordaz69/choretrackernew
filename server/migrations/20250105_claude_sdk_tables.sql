-- Migration: Add Claude SDK orchestration tables
-- Created: 2025-01-05

-- Store SDK session state per user
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  last_active TIMESTAMP DEFAULT NOW(),
  context_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active);

-- Track calls scheduled by SDK
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  custom_instructions TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  created_by TEXT DEFAULT 'sdk-agent',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_calls_user_status ON scheduled_calls(user_id, status);
CREATE INDEX idx_scheduled_calls_scheduled_for ON scheduled_calls(scheduled_for) WHERE status = 'pending';

-- SDK action logging for observability
CREATE TABLE IF NOT EXISTS sdk_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_id UUID,
  actions_taken JSONB NOT NULL,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sdk_actions_user_created ON sdk_actions(user_id, created_at DESC);

-- Add insights column to users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'insights'
  ) THEN
    ALTER TABLE users ADD COLUMN insights JSONB DEFAULT '{
      "patterns": [],
      "preferences": [],
      "goals": [],
      "behaviors": {},
      "lastUpdated": null
    }'::jsonb;
  END IF;
END $$;

-- Add SDK-related columns to interactions (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interactions' AND column_name = 'sentiment'
  ) THEN
    ALTER TABLE interactions ADD COLUMN sentiment TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interactions' AND column_name = 'extracted_commitments'
  ) THEN
    ALTER TABLE interactions ADD COLUMN extracted_commitments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interactions_sentiment ON interactions(sentiment) WHERE sentiment IS NOT NULL;

-- Grant permissions (adjust role name as needed)
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON scheduled_calls TO authenticated;
GRANT ALL ON sdk_actions TO authenticated;
