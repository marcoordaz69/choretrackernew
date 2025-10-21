-- Personal Assistant Database Schema for Supabase PostgreSQL
-- Migration: 001_create_tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE assistant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'America/New_York',

    -- Preferences (stored as JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "morningCheckInTime": "07:00",
        "eveningCheckInTime": "21:00",
        "nudgeFrequency": "moderate",
        "preferVoice": false,
        "quietHours": {
            "start": "22:00",
            "end": "07:00"
        },
        "enabledNudges": {
            "movement": true,
            "hydration": true,
            "tasks": true,
            "habits": true,
            "relationships": true
        }
    }'::JSONB,

    -- Subscription info
    subscription JSONB DEFAULT '{
        "tier": "free",
        "messageCount": 0,
        "resetDate": null
    }'::JSONB,

    -- AI Context
    ai_context JSONB DEFAULT '{
        "personality": "supportive",
        "learningData": {}
    }'::JSONB,

    active BOOLEAN DEFAULT true,
    onboarded BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for phone lookup
CREATE INDEX idx_users_phone ON assistant_users(phone);
CREATE INDEX idx_users_active ON assistant_users(active);

-- ============================================
-- INTERACTIONS TABLE
-- ============================================
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sms_inbound', 'sms_outbound', 'voice_inbound', 'voice_outbound')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),

    -- Content
    content JSONB DEFAULT '{}'::JSONB, -- {userMessage, assistantResponse, transcript}

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB, -- {duration, twilioSid, processed, intent, extractedData}

    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX idx_interactions_user_timestamp ON interactions(user_id, timestamp DESC);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    category VARCHAR(50) DEFAULT 'personal' CHECK (category IN ('work', 'personal', 'health', 'learning', 'relationships', 'other')),

    due_date TIMESTAMP WITH TIME ZONE,
    reminder_time TIMESTAMP WITH TIME ZONE,
    related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

    energy_level VARCHAR(20) DEFAULT 'medium' CHECK (energy_level IN ('low', 'medium', 'high')),
    estimated_duration INTEGER, -- in minutes

    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_user_status_due ON tasks(user_id, status, due_date);

-- ============================================
-- HABITS TABLE
-- ============================================
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('health', 'productivity', 'learning', 'relationships', 'mindfulness', 'other')),
    frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),

    target_days TEXT[], -- ['monday', 'wednesday', 'friday']
    reminder_time VARCHAR(10), -- HH:mm format

    is_quantifiable BOOLEAN DEFAULT false,
    unit VARCHAR(50), -- 'minutes', 'pages', 'glasses', etc.
    target_value NUMERIC,

    -- Streak tracking
    streak JSONB DEFAULT '{
        "current": 0,
        "longest": 0,
        "lastCompleted": null
    }'::JSONB,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_active ON habits(active);

-- ============================================
-- HABIT LOGS TABLE
-- ============================================
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    value NUMERIC, -- For quantifiable habits

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one log per habit per day
    UNIQUE(habit_id, date)
);

-- Indexes
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(date DESC);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, date DESC);

-- ============================================
-- GOALS TABLE
-- ============================================
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('health', 'career', 'financial', 'learning', 'relationships', 'personal', 'other')),
    timeframe VARCHAR(20) NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'long-term')),

    target_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    progress NUMERIC DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    is_quantifiable BOOLEAN DEFAULT false,
    metric JSONB DEFAULT '{}'::JSONB, -- {unit, current, target}

    notes TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);

-- ============================================
-- GOAL MILESTONES TABLE
-- ============================================
CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_goal_id ON goal_milestones(goal_id);

-- ============================================
-- GOAL-HABIT RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE goal_habits (
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    PRIMARY KEY (goal_id, habit_id)
);

-- ============================================
-- DAILY CHECK-INS TABLE
-- ============================================
CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Morning check-in
    morning JSONB DEFAULT '{
        "completed": false,
        "sleepQuality": null,
        "mood": null,
        "energy": null,
        "gratitude": null,
        "topPriorities": [],
        "completedAt": null
    }'::JSONB,

    -- Evening check-in
    evening JSONB DEFAULT '{
        "completed": false,
        "dayRating": null,
        "wins": [],
        "learnings": null,
        "tomorrowPriorities": [],
        "reflection": null,
        "completedAt": null
    }'::JSONB,

    -- Daily metrics
    metrics JSONB DEFAULT '{
        "exerciseMinutes": null,
        "waterGlasses": null,
        "mealsLogged": null,
        "screenTime": null,
        "sleepHours": null
    }'::JSONB,

    -- Mood tracking
    mood JSONB DEFAULT '{
        "overall": null,
        "tags": [],
        "note": null
    }'::JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one check-in per user per day
    UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX idx_checkins_date ON daily_checkins(date DESC);
CREATE INDEX idx_checkins_user_date ON daily_checkins(user_id, date DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON assistant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habit_logs_updated_at BEFORE UPDATE ON habit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON goal_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON daily_checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables (optional - for multi-tenant security)
-- Uncomment if you want user-level data isolation

-- ALTER TABLE assistant_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VIEWS (Helpful queries)
-- ============================================

-- View for active tasks with user info
CREATE VIEW active_tasks AS
SELECT
    t.*,
    u.name as user_name,
    u.phone as user_phone
FROM tasks t
JOIN assistant_users u ON t.user_id = u.id
WHERE t.status IN ('pending', 'in_progress');

-- View for habit streaks
CREATE VIEW habit_streaks AS
SELECT
    h.id,
    h.user_id,
    h.name,
    h.streak->>'current' as current_streak,
    h.streak->>'longest' as longest_streak,
    u.name as user_name
FROM habits h
JOIN assistant_users u ON h.user_id = u.id
WHERE h.active = true;

-- ============================================
-- SAMPLE QUERIES (for reference)
-- ============================================

-- Get user by phone
-- SELECT * FROM assistant_users WHERE phone = '+1234567890';

-- Get today's check-in for user
-- SELECT * FROM daily_checkins WHERE user_id = 'uuid' AND date = CURRENT_DATE;

-- Get active habits for user
-- SELECT * FROM habits WHERE user_id = 'uuid' AND active = true;

-- Get recent interactions
-- SELECT * FROM interactions WHERE user_id = 'uuid' ORDER BY timestamp DESC LIMIT 10;

-- Get tasks due today
-- SELECT * FROM tasks WHERE user_id = 'uuid' AND date(due_date) = CURRENT_DATE AND status != 'completed';
