# Claude Orchestrator Setup Guide

## Prerequisites

You'll need:
- Node.js 18+ installed
- Supabase project with database access
- Anthropic API key

## Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `server/migrations/20250105_claude_sdk_tables.sql`
5. Paste into the SQL editor
6. Click **Run**

You should see success messages for each table created.

### Option B: Via psql (If you have direct database access)

```bash
psql "your-database-connection-string" -f server/migrations/20250105_claude_sdk_tables.sql
```

### Verify Migration

Run this query in Supabase SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'scheduled_calls', 'sdk_actions');
```

You should see 3 rows returned.

## Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cd server/claude-orchestrator
cp .env.example .env
```

2. Edit `.env` and add your credentials:

```bash
# Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Get from Supabase Project Settings > API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NODE_ENV=development
```

### Where to find Supabase credentials:

1. Go to your Supabase project
2. Click **Project Settings** (gear icon)
3. Go to **API** section
4. Copy:
   - **URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_KEY` (not anon key!)

## Step 3: Test Installation

```bash
cd server/claude-orchestrator
node index.js
```

You should see:
```
Claude Orchestrator starting...
Environment: development
✓ Environment variables loaded
✓ Chore Tracker MCP server loaded
✓ Ready to start orchestration service
```

Press Ctrl+C to stop.

## Step 4: Run Interactive Test

Once setup is complete, run the test script to see the system working:

```bash
node test-interactive.js
```

This will:
- Simulate a call completion
- Show Claude analyzing the transcript in real-time
- Display MCP tool calls (scheduling, insights updates)
- Show all database changes
- Let you query the results

## Troubleshooting

### "Missing required environment variables"
- Check your `.env` file exists in `server/claude-orchestrator/`
- Verify all three variables are set (no spaces around `=`)

### "Cannot connect to Supabase"
- Verify your `SUPABASE_URL` is correct
- Make sure you're using `service_role` key, not `anon` key
- Check your Supabase project is active

### "Anthropic API error"
- Verify your API key is valid at https://console.anthropic.com/
- Check you have API credits available

### Tables not created
- Run the migration again (it's safe, uses `IF NOT EXISTS`)
- Check you have permissions in Supabase
- Look for error messages in SQL Editor

## Next Steps

Once setup is complete:
1. Run the interactive test to verify everything works
2. Try simulating different call types
3. Check the Supabase database to see data being created
4. Monitor the console to see Claude's decision-making process
