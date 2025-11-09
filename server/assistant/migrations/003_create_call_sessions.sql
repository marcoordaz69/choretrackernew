-- Migration: Create call_sessions table for unified call tracking
-- Date: 2025-01-08

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,

  -- Call metadata
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  call_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in-progress', 'completed', 'failed', 'cancelled')),

  -- Pre-call briefing (populated by Claude SDK for outbound calls)
  briefing JSONB DEFAULT NULL,

  -- During/post-call data
  interaction_id UUID REFERENCES interactions(id),
  conversation_summary TEXT,
  outcome_assessment JSONB DEFAULT NULL,

  -- Scheduling information (for outbound calls)
  scheduled_for TIMESTAMP WITH TIME ZONE,
  scheduled_by TEXT,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_call_sessions_user_created ON call_sessions(user_id, created_at DESC);
CREATE INDEX idx_call_sessions_status_scheduled ON call_sessions(status, scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_call_sessions_interaction ON call_sessions(interaction_id)
  WHERE interaction_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE call_sessions IS 'Unified tracking for all voice calls with briefing and outcome assessment';
COMMENT ON COLUMN call_sessions.briefing IS 'Strategic context from Claude SDK: {trigger_reason, detected_patterns, conversation_goals, recent_context}';
COMMENT ON COLUMN call_sessions.outcome_assessment IS 'Post-call analysis: {goal_achieved, effectiveness, follow_up_needed, follow_up_action, user_satisfaction}';
