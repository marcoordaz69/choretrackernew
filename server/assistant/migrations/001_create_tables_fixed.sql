-- Personal Assistant Database Schema for Supabase PostgreSQL
-- Migration: 001_create_tables (FIXED ORDER)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assistant_users (
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
CREATE INDEX IF NOT EXISTS idx_users_phone ON assistant_users(phone);
CREATE INDEX IF NOT EXISTS idx_users_active ON assistant_users(active);

-- ============================================
-- INTERACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sms_inbound', 'sms_outbound', 'voice_inbound', 'voice_outbound')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),

    -- Content
    content JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,

    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_timestamp ON interactions(user_id, timestamp DESC);

-- ============================================
-- GOALS TABLE (MOVED BEFORE TASKS)
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
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
    metric JSONB DEFAULT '{}'::JSONB,

    notes TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- ============================================
-- TASKS TABLE (NOW AFTER GOALS)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
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
    estimated_duration INTEGER,

    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON tasks(user_id, status, due_date);

-- ============================================
-- HABITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('health', 'productivity', 'learning', 'relationships', 'mindfulness', 'other')),
    frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),

    target_days TEXT[],
    reminder_time VARCHAR(10),

    is_quantifiable BOOLEAN DEFAULT false,
    unit VARCHAR(50),
    target_value NUMERIC,

    streak JSONB DEFAULT '{
        "current": 0,
        "longest": 0,
        "lastCompleted": null
    }'::JSONB,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(active);

-- ============================================
-- HABIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    value NUMERIC,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date DESC);

-- ============================================
-- GOAL MILESTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON goal_milestones(goal_id);

-- ============================================
-- GOAL-HABIT RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goal_habits (
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    PRIMARY KEY (goal_id, habit_id)
);

-- ============================================
-- DAILY CHECK-INS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assistant_users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    morning JSONB DEFAULT '{
        "completed": false,
        "sleepQuality": null,
        "mood": null,
        "energy": null,
        "gratitude": null,
        "topPriorities": [],
        "completedAt": null
    }'::JSONB,

    evening JSONB DEFAULT '{
        "completed": false,
        "dayRating": null,
        "wins": [],
        "learnings": null,
        "tomorrowPriorities": [],
        "reflection": null,
        "completedAt": null
    }'::JSONB,

    metrics JSONB DEFAULT '{
        "exerciseMinutes": null,
        "waterGlasses": null,
        "mealsLogged": null,
        "screenTime": null,
        "sleepHours": null
    }'::JSONB,

    mood JSONB DEFAULT '{
        "overall": null,
        "tags": [],
        "note": null
    }'::JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON daily_checkins(user_id, date DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON assistant_users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON assistant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interactions_updated_at ON interactions;
CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON habit_logs;
CREATE TRIGGER update_habit_logs_updated_at BEFORE UPDATE ON habit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON goal_milestones;
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON goal_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checkins_updated_at ON daily_checkins;
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON daily_checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS (Helpful queries)
-- ============================================
CREATE OR REPLACE VIEW active_tasks AS
SELECT
    t.*,
    u.name as user_name,
    u.phone as user_phone
FROM tasks t
JOIN assistant_users u ON t.user_id = u.id
WHERE t.status IN ('pending', 'in_progress');

CREATE OR REPLACE VIEW habit_streaks AS
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
