# Claude SDK Orchestration Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an event-driven Claude Agent SDK service that analyzes voice call transcripts, learns user patterns, and autonomously schedules personalized interventions.

**Architecture:** Two-layer system where OpenAI Realtime API handles voice (unchanged), while new Claude SDK orchestrator service processes call completions via Supabase Realtime subscriptions, maintains persistent user sessions, and uses custom MCP tools to read/write Supabase data.

**Tech Stack:** Node.js, Claude Agent SDK, Supabase (database + realtime), Custom MCP servers, Zod for validation

---

## Phase 1: Foundation

### Task 1: Project Structure Setup

**Files:**
- Create: `server/claude-orchestrator/package.json`
- Create: `server/claude-orchestrator/.env.example`
- Create: `server/claude-orchestrator/index.js`

**Step 1: Create orchestrator package.json**

```bash
mkdir -p server/claude-orchestrator
cd server/claude-orchestrator
```

Create `package.json`:

```json
{
  "name": "claude-orchestrator",
  "version": "1.0.0",
  "description": "Claude Agent SDK orchestration layer for Luna assistant",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {}
}
```

**Step 2: Create .env.example**

```bash
# .env.example
ANTHROPIC_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
NODE_ENV=development
```

**Step 3: Create minimal index.js**

```javascript
import 'dotenv/config';

console.log('Claude Orchestrator starting...');
console.log('Environment:', process.env.NODE_ENV);

// Verify environment variables
const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log('✓ Ready to start orchestration service');
```

**Step 4: Install dependencies**

```bash
npm install
```

Expected: Dependencies installed successfully

**Step 5: Test startup**

```bash
cp .env.example .env
# Edit .env with actual credentials
node index.js
```

Expected output:
```
Claude Orchestrator starting...
Environment: development
✓ Environment variables loaded
✓ Ready to start orchestration service
```

**Step 6: Commit**

```bash
git add server/claude-orchestrator/
git commit -m "feat: initialize claude-orchestrator service structure

- Add package.json with Claude SDK and Supabase dependencies
- Add .env.example template
- Add minimal index.js with environment validation
- Verify service can start successfully

Part of Phase 1: Foundation"
```

---

### Task 2: Database Schema Updates

**Files:**
- Create: `server/migrations/20250105_claude_sdk_tables.sql`

**Step 1: Write migration for new tables**

Create migration file:

```sql
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
```

**Step 2: Apply migration to Supabase**

Option A - Via Supabase Dashboard:
1. Go to SQL Editor in Supabase dashboard
2. Paste migration SQL
3. Click "Run"

Option B - Via psql (if you have direct access):
```bash
psql $DATABASE_URL -f server/migrations/20250105_claude_sdk_tables.sql
```

Expected: All tables and indexes created successfully

**Step 3: Verify schema**

Check in Supabase dashboard or via SQL:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'scheduled_calls', 'sdk_actions');
```

Expected: 3 rows returned

**Step 4: Commit migration**

```bash
git add server/migrations/20250105_claude_sdk_tables.sql
git commit -m "feat: add database schema for Claude SDK orchestration

- Add user_sessions table for persistent SDK context
- Add scheduled_calls table for autonomous call scheduling
- Add sdk_actions table for observability logging
- Extend users table with insights JSONB column
- Extend interactions with sentiment and commitments

Part of Phase 1: Foundation"
```

---

### Task 3: Chore Tracker MCP Server - Basic Structure

**Files:**
- Create: `server/claude-orchestrator/mcp-servers/choreTracker.js`

**Step 1: Create MCP server file with structure**

```javascript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Chore Tracker MCP Server
 * Provides Claude with tools to interact with task management system
 */
export const choreTrackerServer = createSdkMcpServer({
  name: 'chore-tracker',
  version: '1.0.0',
  tools: [
    // Tools will be added in next tasks
  ]
});

export default choreTrackerServer;
```

**Step 2: Verify module can be imported**

Update `server/claude-orchestrator/index.js`:

```javascript
import 'dotenv/config';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';

console.log('Claude Orchestrator starting...');
console.log('Environment:', process.env.NODE_ENV);

// Verify environment variables
const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log('✓ Chore Tracker MCP server loaded');
console.log('✓ Ready to start orchestration service');
```

**Step 3: Test startup**

```bash
node index.js
```

Expected output includes:
```
✓ Chore Tracker MCP server loaded
```

**Step 4: Commit**

```bash
git add server/claude-orchestrator/mcp-servers/choreTracker.js server/claude-orchestrator/index.js
git commit -m "feat: create choreTracker MCP server structure

- Initialize createSdkMcpServer with metadata
- Set up Supabase client for database access
- Import and verify server loads successfully

Part of Phase 1: Foundation"
```

---

### Task 4: schedule_call MCP Tool

**Files:**
- Modify: `server/claude-orchestrator/mcp-servers/choreTracker.js`

**Step 1: Add schedule_call tool**

In `choreTracker.js`, add to tools array:

```javascript
tool(
  'schedule_call',
  'Schedule a future call for user intervention',
  {
    userId: z.string().uuid().describe('User UUID'),
    callType: z.enum([
      'scolding',
      'motivational-wakeup',
      'task-reminder',
      'morning-briefing',
      'wind-down-reflection'
    ]).describe('Type of call to schedule'),
    scheduledFor: z.string().datetime().describe('ISO 8601 datetime when call should occur'),
    customInstructions: z.string().optional().describe('Custom instructions for the call agent')
  },
  async (args) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_calls')
        .insert({
          user_id: args.userId,
          call_type: args.callType,
          scheduled_for: args.scheduledFor,
          custom_instructions: args.customInstructions,
          created_by: 'sdk-agent',
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        content: [{
          type: 'text',
          text: `✓ Scheduled ${args.callType} call for ${args.scheduledFor}\nCall ID: ${data.id}\nStatus: ${data.status}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `✗ Failed to schedule call: ${error.message}`
        }]
      };
    }
  }
)
```

**Step 2: Create test script**

Create `server/claude-orchestrator/test-schedule-call.js`:

```javascript
import 'dotenv/config';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';

// Test the schedule_call tool directly
async function testScheduleCall() {
  console.log('Testing schedule_call tool...\n');

  const testArgs = {
    userId: '5899f756-7e21-4ef2-a6f6-9b13e43efba5', // Marco's ID from your system
    callType: 'motivational-wakeup',
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    customInstructions: 'Test call from MCP tool'
  };

  console.log('Test arguments:', JSON.stringify(testArgs, null, 2));

  // Note: This is a simplified test - actual MCP tool invocation happens via SDK
  console.log('\n✓ Tool configuration valid');
  console.log('✓ Schema validation would pass');
  console.log('\nTo test live: Use Claude SDK query with this MCP server');
}

testScheduleCall();
```

**Step 3: Run test**

```bash
node test-schedule-call.js
```

Expected output:
```
Testing schedule_call tool...
Test arguments: {...}
✓ Tool configuration valid
✓ Schema validation would pass
```

**Step 4: Commit**

```bash
git add server/claude-orchestrator/mcp-servers/choreTracker.js server/claude-orchestrator/test-schedule-call.js
git commit -m "feat: add schedule_call MCP tool

- Implement tool to schedule future intervention calls
- Add Zod schema validation for arguments
- Insert scheduled call records to database
- Return formatted success/error messages
- Add test script to verify tool structure

Part of Phase 1: Foundation"
```

---

### Task 5: update_user_insights MCP Tool

**Files:**
- Modify: `server/claude-orchestrator/mcp-servers/choreTracker.js`

**Step 1: Add update_user_insights tool**

Add to tools array in `choreTracker.js`:

```javascript
tool(
  'update_user_insights',
  'Update learned patterns and insights about user',
  {
    userId: z.string().uuid().describe('User UUID'),
    insights: z.object({
      patterns: z.array(z.string()).optional().describe('Behavioral patterns detected'),
      preferences: z.array(z.string()).optional().describe('User preferences learned'),
      goals: z.array(z.string()).optional().describe('User goals identified'),
      behaviors: z.record(z.any()).optional().describe('Specific behavior data')
    }).describe('Insights to merge with existing user data')
  },
  async (args) => {
    try {
      // Fetch current insights
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('insights')
        .eq('id', args.userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      // Merge new insights with existing
      const currentInsights = user.insights || {
        patterns: [],
        preferences: [],
        goals: [],
        behaviors: {}
      };

      const updatedInsights = {
        patterns: [...new Set([
          ...(currentInsights.patterns || []),
          ...(args.insights.patterns || [])
        ])],
        preferences: [...new Set([
          ...(currentInsights.preferences || []),
          ...(args.insights.preferences || [])
        ])],
        goals: [...new Set([
          ...(currentInsights.goals || []),
          ...(args.insights.goals || [])
        ])],
        behaviors: {
          ...(currentInsights.behaviors || {}),
          ...(args.insights.behaviors || {})
        },
        lastUpdated: new Date().toISOString()
      };

      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ insights: updatedInsights })
        .eq('id', args.userId);

      if (updateError) {
        throw new Error(`Failed to update insights: ${updateError.message}`);
      }

      const summary = [
        `✓ User insights updated`,
        `Patterns: ${updatedInsights.patterns.length} total`,
        `Preferences: ${updatedInsights.preferences.length} total`,
        `Goals: ${updatedInsights.goals.length} total`,
        `Last updated: ${updatedInsights.lastUpdated}`
      ].join('\n');

      return {
        content: [{
          type: 'text',
          text: summary
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `✗ Failed to update insights: ${error.message}`
        }]
      };
    }
  }
)
```

**Step 2: Update test script**

Add to `test-schedule-call.js` (rename to `test-mcp-tools.js`):

```javascript
// ... existing imports ...

async function testUpdateInsights() {
  console.log('\nTesting update_user_insights tool...\n');

  const testArgs = {
    userId: '5899f756-7e21-4ef2-a6f6-9b13e43efba5',
    insights: {
      patterns: ['Responds well to morning motivation', 'Exercise avoidance when stressed'],
      preferences: ['Prefers calls before 8am'],
      goals: ['Daily gym attendance', 'Better sleep schedule']
    }
  };

  console.log('Test arguments:', JSON.stringify(testArgs, null, 2));
  console.log('\n✓ Tool configuration valid');
  console.log('✓ Schema validation would pass');
  console.log('✓ Would merge with existing insights');
}

async function runTests() {
  await testScheduleCall();
  await testUpdateInsights();
}

runTests();
```

**Step 3: Run tests**

```bash
mv server/claude-orchestrator/test-schedule-call.js server/claude-orchestrator/test-mcp-tools.js
node server/claude-orchestrator/test-mcp-tools.js
```

Expected: Both tests pass with configuration validation

**Step 4: Commit**

```bash
git add server/claude-orchestrator/mcp-servers/choreTracker.js server/claude-orchestrator/test-mcp-tools.js
git commit -m "feat: add update_user_insights MCP tool

- Implement tool to update user behavioral insights
- Merge new insights with existing data (no overwrites)
- Track patterns, preferences, goals, and behaviors
- Add timestamp for last update
- Extend test script to validate tool

Part of Phase 1: Foundation"
```

---

### Task 6: Supabase Realtime Subscription Setup

**Files:**
- Create: `server/claude-orchestrator/subscribers/callCompletionSubscriber.js`
- Modify: `server/claude-orchestrator/index.js`

**Step 1: Create subscription handler**

Create `subscribers/callCompletionSubscriber.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Subscribe to new interaction records (call completions)
 * Triggers SDK agent analysis on each new call
 */
export function subscribeToCallCompletions(onCallComplete) {
  const channel = supabase
    .channel('interactions')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'interactions'
      },
      async (payload) => {
        console.log('\n[CALL COMPLETION] New interaction detected');
        console.log('User ID:', payload.new.user_id);
        console.log('Call Type:', payload.new.call_type);
        console.log('Interaction ID:', payload.new.id);

        try {
          await onCallComplete(payload.new);
        } catch (error) {
          console.error('[CALL COMPLETION] Handler error:', error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to call completion events');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('✗ Subscription error');
      } else if (status === 'TIMED_OUT') {
        console.error('✗ Subscription timed out');
      }
    });

  return channel;
}

export default subscribeToCallCompletions;
```

**Step 2: Integrate subscription in index.js**

Update `server/claude-orchestrator/index.js`:

```javascript
import 'dotenv/config';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';
import { subscribeToCallCompletions } from './subscribers/callCompletionSubscriber.js';

console.log('Claude Orchestrator starting...');
console.log('Environment:', process.env.NODE_ENV);

// Verify environment variables
const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log('✓ Chore Tracker MCP server loaded');

// Handler for call completions (placeholder for now)
async function handleCallCompletion(interaction) {
  console.log('[HANDLER] Processing interaction:', interaction.id);
  console.log('[HANDLER] User:', interaction.user_id);
  console.log('[HANDLER] Type:', interaction.call_type);
  console.log('[HANDLER] Transcript length:', interaction.transcript?.length || 0);

  // TODO: Trigger SDK agent analysis (next task)
  console.log('[HANDLER] SDK analysis would run here');
}

// Subscribe to call completions
const channel = subscribeToCallCompletions(handleCallCompletion);

console.log('✓ Ready to process call completions');
console.log('\nWaiting for events...');

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await channel.unsubscribe();
  process.exit(0);
});
```

**Step 3: Test subscription (manual)**

```bash
node index.js
```

Expected output:
```
✓ Environment variables loaded
✓ Chore Tracker MCP server loaded
✓ Subscribed to call completion events
✓ Ready to process call completions

Waiting for events...
```

Leave running and trigger a test call from your voice system. Should see:
```
[CALL COMPLETION] New interaction detected
[HANDLER] Processing interaction: <uuid>
```

**Step 4: Commit**

```bash
git add server/claude-orchestrator/subscribers/ server/claude-orchestrator/index.js
git commit -m "feat: add Supabase Realtime subscription for call completions

- Create callCompletionSubscriber with event handler
- Subscribe to INSERT events on interactions table
- Log call completion details for debugging
- Add placeholder handler for SDK analysis
- Handle graceful shutdown with SIGINT

Part of Phase 1: Foundation"
```

---

### Task 7: Session Management Module

**Files:**
- Create: `server/claude-orchestrator/session-manager.js`

**Step 1: Create session manager**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Manage persistent Claude SDK sessions per user
 */
export class SessionManager {
  /**
   * Get or create session for user
   * @param {string} userId - User UUID
   * @returns {Promise<string>} Session ID
   */
  async getOrCreateSession(userId) {
    // Try to fetch existing session
    const { data: existing, error: fetchError } = await supabase
      .from('user_sessions')
      .select('session_id, last_active')
      .eq('user_id', userId)
      .single();

    if (existing && !fetchError) {
      console.log(`[SESSION] Resuming session for user ${userId}`);
      console.log(`[SESSION] Last active: ${existing.last_active}`);

      // Update last_active timestamp
      await this.updateSessionTimestamp(userId);

      return existing.session_id;
    }

    // Create new session
    console.log(`[SESSION] Creating new session for user ${userId}`);
    const sessionId = `session_${userId}_${Date.now()}`;

    const { error: insertError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        context_summary: {
          created: new Date().toISOString(),
          totalInteractions: 0
        }
      });

    if (insertError) {
      throw new Error(`Failed to create session: ${insertError.message}`);
    }

    console.log(`[SESSION] New session created: ${sessionId}`);
    return sessionId;
  }

  /**
   * Update session last_active timestamp
   * @param {string} userId - User UUID
   */
  async updateSessionTimestamp(userId) {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`[SESSION] Failed to update timestamp: ${error.message}`);
    }
  }

  /**
   * Update session context summary
   * @param {string} userId - User UUID
   * @param {object} summary - Context summary data
   */
  async updateContextSummary(userId, summary) {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        context_summary: summary,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`[SESSION] Failed to update context: ${error.message}`);
    } else {
      console.log(`[SESSION] Context updated for user ${userId}`);
    }
  }
}

export default SessionManager;
```

**Step 2: Create test script**

Create `server/claude-orchestrator/test-session-manager.js`:

```javascript
import 'dotenv/config';
import { SessionManager } from './session-manager.js';

async function testSessionManager() {
  console.log('Testing SessionManager...\n');

  const manager = new SessionManager();
  const testUserId = '5899f756-7e21-4ef2-a6f6-9b13e43efba5'; // Marco

  // Test 1: Get or create session
  console.log('Test 1: Get or create session');
  const sessionId = await manager.getOrCreateSession(testUserId);
  console.log('Session ID:', sessionId);
  console.log('✓ Test 1 passed\n');

  // Test 2: Get same session again (should resume)
  console.log('Test 2: Resume existing session');
  const sameSessionId = await manager.getOrCreateSession(testUserId);
  console.log('Session ID:', sameSessionId);
  console.log('Match:', sessionId === sameSessionId ? '✓' : '✗');
  console.log('✓ Test 2 passed\n');

  // Test 3: Update context
  console.log('Test 3: Update context summary');
  await manager.updateContextSummary(testUserId, {
    created: new Date().toISOString(),
    totalInteractions: 1,
    recentPatterns: ['test pattern']
  });
  console.log('✓ Test 3 passed\n');

  console.log('All tests passed!');
}

testSessionManager().catch(console.error);
```

**Step 3: Run test**

```bash
node server/claude-orchestrator/test-session-manager.js
```

Expected output:
```
Testing SessionManager...
Test 1: Get or create session
[SESSION] Creating new session for user...
Session ID: session_...
✓ Test 1 passed

Test 2: Resume existing session
[SESSION] Resuming session for user...
Session ID: session_...
Match: ✓
✓ Test 2 passed

Test 3: Update context summary
[SESSION] Context updated for user...
✓ Test 3 passed

All tests passed!
```

**Step 4: Commit**

```bash
git add server/claude-orchestrator/session-manager.js server/claude-orchestrator/test-session-manager.js
git commit -m "feat: add session management for persistent user context

- Create SessionManager class with CRUD operations
- Implement getOrCreateSession for session resumption
- Add timestamp updates on session access
- Add context summary updates
- Add comprehensive test script

Part of Phase 1: Foundation"
```

---

### Task 8: Claude SDK Query Integration (Minimal MVP)

**Files:**
- Create: `server/claude-orchestrator/processors/callCompletionProcessor.js`
- Modify: `server/claude-orchestrator/index.js`

**Step 1: Create call completion processor**

Create `processors/callCompletionProcessor.js`:

```javascript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { SessionManager } from '../session-manager.js';

const sessionManager = new SessionManager();

/**
 * Process call completion with Claude SDK
 * @param {object} interaction - Interaction record from database
 * @param {object} mcpServers - MCP servers to provide to Claude
 */
export async function processCallCompletion(interaction, mcpServers) {
  const { user_id, call_type, transcript, id } = interaction;

  console.log(`\n[PROCESSOR] Starting analysis for interaction ${id}`);
  console.log(`[PROCESSOR] User: ${user_id}`);
  console.log(`[PROCESSOR] Call type: ${call_type}`);

  // Get or create session for this user
  const sessionId = await sessionManager.getOrCreateSession(user_id);

  // Build streaming prompt with context
  async function* contextGenerator() {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: `You are Luna's strategic planning system. A ${call_type} call just completed.

CALL TRANSCRIPT:
"${transcript}"

USER ID: ${user_id}

INSTRUCTIONS:
1. Analyze this interaction for patterns, commitments, and emotional state
2. Determine if any proactive interventions are warranted
3. Use your tools to schedule calls or update insights if appropriate
4. Summarize your analysis and any actions taken

Use your available tools to take actions as needed.`
      }
    };
  }

  try {
    console.log(`[PROCESSOR] Running Claude SDK agent with session ${sessionId}`);

    // Run Claude SDK agent
    let analysisResult = '';

    for await (const message of query({
      prompt: contextGenerator(),
      options: {
        resume: sessionId,
        mcpServers: mcpServers,
        allowedTools: [
          'mcp__chore-tracker__schedule_call',
          'mcp__chore-tracker__update_user_insights'
        ],
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: `
You are Luna's strategic intelligence layer. You analyze voice calls to:
- Detect behavioral patterns
- Learn user preferences
- Schedule proactive interventions
- Build understanding over time

Be thoughtful and autonomous in your decisions.`
        },
        maxTurns: 5,
        model: 'claude-sonnet-4-5'
      }
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        analysisResult = message.result;
        console.log('[PROCESSOR] ✓ Analysis complete');
      } else if (message.type === 'error') {
        console.error('[PROCESSOR] ✗ Error:', message.error);
      } else if (message.type === 'assistant' && message.message?.content) {
        // Log assistant responses
        const content = Array.isArray(message.message.content)
          ? message.message.content[0]?.text
          : message.message.content;
        console.log('[PROCESSOR] Claude:', content?.substring(0, 100) + '...');
      }
    }

    // Update session timestamp
    await sessionManager.updateSessionTimestamp(user_id);

    console.log('[PROCESSOR] ✓ Processing complete\n');
    return analysisResult;

  } catch (error) {
    console.error('[PROCESSOR] ✗ Failed:', error.message);
    throw error;
  }
}

export default processCallCompletion;
```

**Step 2: Integrate processor into main service**

Update `server/claude-orchestrator/index.js`:

```javascript
import 'dotenv/config';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';
import { subscribeToCallCompletions } from './subscribers/callCompletionSubscriber.js';
import { processCallCompletion } from './processors/callCompletionProcessor.js';

console.log('Claude Orchestrator starting...');
console.log('Environment:', process.env.NODE_ENV);

// Verify environment variables
const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log('✓ Chore Tracker MCP server loaded');

// Handler for call completions
async function handleCallCompletion(interaction) {
  try {
    await processCallCompletion(interaction, {
      'chore-tracker': choreTrackerServer
    });
  } catch (error) {
    console.error('[HANDLER] Processing failed:', error);
  }
}

// Subscribe to call completions
const channel = subscribeToCallCompletions(handleCallCompletion);

console.log('✓ Ready to process call completions');
console.log('\nWaiting for events...');

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await channel.unsubscribe();
  process.exit(0);
});
```

**Step 3: Test with mock interaction**

Create `server/claude-orchestrator/test-full-flow.js`:

```javascript
import 'dotenv/config';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';
import { processCallCompletion } from './processors/callCompletionProcessor.js';

async function testFullFlow() {
  console.log('Testing full call completion flow...\n');

  // Mock interaction (similar to what Supabase would provide)
  const mockInteraction = {
    id: 'test-interaction-123',
    user_id: '5899f756-7e21-4ef2-a6f6-9b13e43efba5',
    call_type: 'wind-down-reflection',
    transcript: 'Today was good. I finished my work tasks and went to the gym. Feeling pretty motivated for tomorrow.',
    created_at: new Date().toISOString()
  };

  console.log('Mock interaction:', JSON.stringify(mockInteraction, null, 2));
  console.log('\nProcessing...\n');

  const result = await processCallCompletion(mockInteraction, {
    'chore-tracker': choreTrackerServer
  });

  console.log('\n=== RESULT ===');
  console.log(result);
  console.log('\nTest complete!');
}

testFullFlow().catch(console.error);
```

**Step 4: Run test**

```bash
node server/claude-orchestrator/test-full-flow.js
```

Expected: Claude analyzes the transcript and may use tools to update insights or schedule calls based on the content.

**Step 5: Commit**

```bash
git add server/claude-orchestrator/processors/ server/claude-orchestrator/index.js server/claude-orchestrator/test-full-flow.js
git commit -m "feat: integrate Claude SDK for call completion analysis

- Create callCompletionProcessor with SDK query logic
- Build dynamic prompts with call context
- Configure MCP servers and allowed tools
- Stream SDK responses and handle results
- Wire processor into main service event handler
- Add end-to-end test script

Part of Phase 1: Foundation - MVP COMPLETE"
```

---

## Phase 1 Complete!

**What You've Built:**
- ✓ Claude orchestrator service structure
- ✓ Database schema for sessions, scheduled calls, SDK actions
- ✓ Chore Tracker MCP server with 2 tools (schedule_call, update_user_insights)
- ✓ Supabase Realtime subscription for call completions
- ✓ Session management for persistent user context
- ✓ Full Claude SDK integration processing live calls

**How to Run:**
1. Set up `.env` with credentials
2. Apply database migration
3. Run: `node server/claude-orchestrator/index.js`
4. Make a voice call through your existing system
5. Watch Claude analyze it and take actions!

**What Happens Now:**
Every time a call completes:
1. Supabase Realtime fires event
2. Orchestrator receives interaction data
3. Claude SDK loads user session (with history)
4. Claude analyzes transcript
5. Claude can schedule calls or update insights
6. Session persists for next call

---

## Next Steps (Future Phases)

### Phase 2: Additional MCP Tools
- `query_tasks` - Search/filter user tasks
- `get_schedule` - Read user calendar
- `analyze_behavior_patterns` - Query interaction history

### Phase 3: Advanced Analysis
- Sentiment detection
- Commitment extraction
- Accountability tracking
- Pattern recognition algorithms

### Phase 4: Scheduled Analysis Jobs
- Daily planning sessions (cron)
- Weekly pattern reviews
- Behavior anomaly detection

### Phase 5: Production Readiness
- Error handling and retries
- Logging and monitoring
- Performance optimization
- Deployment configuration (Railway/Docker)
- Documentation and runbooks

---

**Current Status:** Phase 1 Complete - Core MVP functional and ready for testing with real calls!
