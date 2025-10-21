# Supabase Setup Guide - Personal Assistant

## Overview

Your Personal Assistant has been converted to use **Supabase PostgreSQL** instead of MongoDB. This guide will walk you through setting up the database.

---

## Quick Setup (5 minutes)

### 1. Get Your Supabase API Keys

You already have a Supabase project. Now you need to get your API keys:

**A. Go to your Supabase Dashboard:**
```
https://app.supabase.com/project/jimuzwrgqaurctkeocag/settings/api
```

**B. Copy these values:**
- **URL**: `https://jimuzwrgqaurctkeocag.supabase.co` ✓ (already in .env)
- **anon/public key**: Copy the `anon public` key
- **service_role key**: (Optional) Copy for admin operations

**C. Update your `.env` file:**
```bash
SUPABASE_URL=https://jimuzwrgqaurctkeocag.supabase.co
SUPABASE_ANON_KEY=paste-your-anon-key-here
```

### 2. Run the Database Migration

**A. Go to SQL Editor in Supabase:**
```
https://app.supabase.com/project/jimuzwrgqaurctkeocag/sql/new
```

**B. Copy the entire SQL migration:**
```bash
# From your project:
cat server/assistant/migrations/001_create_tables.sql
```

**C. Paste into Supabase SQL Editor and click "Run"**

This will create all tables:
- `assistant_users`
- `interactions`
- `tasks`
- `habits`
- `habit_logs`
- `goals`
- `goal_milestones`
- `goal_habits`
- `daily_checkins`

### 3. Verify Setup

**A. Check tables were created:**
- Go to Table Editor: https://app.supabase.com/project/jimuzwrgqaurctkeocag/editor
- You should see all 9 tables

**B. Test connection:**
```bash
npm run assistant:dev
```

You should see:
```
✓ Connected to Supabase PostgreSQL successfully
```

---

## What Changed from MongoDB

### Database Changes

| MongoDB | PostgreSQL (Supabase) |
|---------|----------------------|
| `AssistantUser` collection | `assistant_users` table |
| `Interaction` collection | `interactions` table |
| `Task` collection | `tasks` table |
| `Habit` collection (with embedded logs) | `habits` + `habit_logs` tables |
| `Goal` collection (with embedded milestones) | `goals` + `goal_milestones` + `goal_habits` tables |
| `DailyCheckIn` collection | `daily_checkins` table |

### Key Differences

1. **IDs**: UUIDs instead of MongoDB ObjectIDs
2. **Relationships**: Foreign keys instead of references
3. **Nested Data**: JSONB columns for complex objects (preferences, metadata, etc.)
4. **Embedded Arrays**: Separate tables (habit_logs, goal_milestones)

### API Compatibility

The model APIs remain mostly the same:
```javascript
// Still works the same:
const user = await User.findByPhone('+1234567890');
await user.incrementMessageCount();

const tasks = await Task.findPending(userId);
await habit.logCompletion(45, 'Great workout!');
```

---

## Database Schema

### Core Tables

#### `assistant_users`
- User profiles and preferences
- Subscription info
- AI context and learning data

#### `interactions`
- All SMS and voice interactions
- Content and metadata stored as JSONB
- Full conversation history

#### `tasks`
- Task management with priorities
- Due dates and reminders
- Links to goals

#### `habits` + `habit_logs`
- Habit definitions
- Separate log entries per day
- Automatic streak calculation

#### `goals` + `goal_milestones` + `goal_habits`
- Goal tracking with progress
- Milestones as separate records
- Many-to-many relationship with habits

#### `daily_checkins`
- Morning and evening check-ins
- Daily metrics and mood tracking
- JSONB for flexible data

---

## Advanced Configuration

### Enable Row Level Security (Optional)

If you want user-level data isolation:

```sql
-- Enable RLS on all tables
ALTER TABLE assistant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Create policy (example for users)
CREATE POLICY "Users can only see their own data"
  ON assistant_users
  FOR ALL
  USING (id = auth.uid());
```

### Database Backups

Supabase automatically backs up your database daily. To manually backup:

1. Go to: https://app.supabase.com/project/jimuzwrgqaurctkeocag/settings/database
2. Click "Download backup"

### Performance Optimization

The migration includes indexes on:
- Phone numbers for fast user lookup
- User IDs for all related data
- Timestamps for chronological queries
- Composite indexes for common query patterns

### View Your Data

**SQL Editor:**
```sql
-- Get all users
SELECT * FROM assistant_users;

-- Get recent interactions for a user
SELECT * FROM interactions
WHERE user_id = 'some-uuid'
ORDER BY timestamp DESC
LIMIT 10;

-- Get active habits with streaks
SELECT * FROM habit_streaks;  -- Pre-built view
```

**Table Editor:**
- Browse data visually: https://app.supabase.com/project/jimuzwrgqaurctkeocag/editor

---

## Troubleshooting

### "SUPABASE_URL is not defined"
- Make sure `.env` file is in project root
- Check the values are uncommented (no # at start of line)
- Restart the server

### "Failed to connect to Supabase"
- Verify your API keys are correct
- Check your internet connection
- Verify project is active in Supabase dashboard

### "relation does not exist"
- Run the migration SQL
- Make sure all tables were created
- Check for SQL errors in Supabase SQL Editor

### Migration fails
- Clear existing tables if retrying:
  ```sql
  DROP TABLE IF EXISTS goal_habits CASCADE;
  DROP TABLE IF EXISTS goal_milestones CASCADE;
  DROP TABLE IF EXISTS habit_logs CASCADE;
  DROP TABLE IF EXISTS daily_checkins CASCADE;
  DROP TABLE IF EXISTS goals CASCADE;
  DROP TABLE IF EXISTS habits CASCADE;
  DROP TABLE IF EXISTS tasks CASCADE;
  DROP TABLE IF EXISTS interactions CASCADE;
  DROP TABLE IF EXISTS assistant_users CASCADE;
  ```
- Then run migration again

---

## API Examples

### Create a new user
```javascript
const user = await User.create({
  phone: '+1234567890',
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Log an interaction
```javascript
await Interaction.create({
  userId: user.id,
  type: 'sms_inbound',
  direction: 'inbound',
  content: {
    userMessage: 'Hello!',
    assistantResponse: 'Hi! How can I help?'
  },
  metadata: {
    twilioSid: 'SM123...',
    intent: 'greeting'
  }
});
```

### Track a habit
```javascript
const habit = await Habit.create({
  userId: user.id,
  name: 'Exercise',
  frequency: 'daily',
  isQuantifiable: true,
  unit: 'minutes',
  targetValue: 30
});

// Log completion
await habit.logCompletion(45, 'Great workout!');

// Check streak
console.log(habit.streak.current); // Current streak days
```

### Manage tasks
```javascript
// Create task
const task = await Task.create({
  userId: user.id,
  title: 'Call mom',
  priority: 'high',
  dueDate: new Date('2025-10-21')
});

// Find tasks due today
const todayTasks = await Task.findDueToday(user.id);

// Complete task
await task.complete();
```

### Daily check-ins
```javascript
// Get or create today's check-in
const checkin = await DailyCheckIn.getTodayCheckIn(user.id);

// Update morning check-in
await checkin.updateMorning({
  sleepQuality: 8,
  mood: 9,
  energy: 7,
  gratitude: 'Grateful for my health',
  topPriorities: ['Finish proposal', 'Gym', 'Call mom']
});

// Update evening reflection
await checkin.updateEvening({
  dayRating: 8,
  wins: ['Finished proposal', 'Great workout'],
  learnings: 'Starting early makes a huge difference',
  reflection: 'Productive day overall'
});
```

---

## Next Steps

1. ✅ Get Supabase API keys
2. ✅ Run SQL migration
3. ✅ Update `.env` file
4. ✅ Test connection with `npm run assistant:dev`
5. 🎯 Set up ngrok (see `SETUP_GUIDE.md`)
6. 🎯 Configure Twilio webhooks
7. 🎯 Start using your Personal Assistant!

---

## Resources

- **Supabase Dashboard**: https://app.supabase.com/project/jimuzwrgqaurctkeocag
- **SQL Editor**: https://app.supabase.com/project/jimuzwrgqaurctkeocag/sql
- **Table Editor**: https://app.supabase.com/project/jimuzwrgqaurctkeocag/editor
- **API Settings**: https://app.supabase.com/project/jimuzwrgqaurctkeocag/settings/api
- **Supabase Docs**: https://supabase.com/docs

---

**Your Personal Assistant is now powered by Supabase PostgreSQL! 🚀**
