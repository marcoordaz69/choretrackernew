# Call Briefing and History Tracking - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement bidirectional context flow between Claude SDK and voice agent with unified call tracking and pre-call briefings.

**Architecture:** New `call_sessions` table tracks all calls (inbound/outbound) with briefing, summary, and outcome assessment. Claude SDK creates sessions with strategic context, scheduler passes sessionId to voice agent, voice agent loads briefing and injects into system prompt, post-call analysis links interaction and updates session with outcomes.

**Tech Stack:** PostgreSQL (Supabase), Node.js, Express, Twilio, OpenAI Realtime API, Claude Agent SDK, MCP tools

---

## Phase 1: Database Foundation

### Task 1: Create `call_sessions` Table Migration

**Files:**
- Create: `server/assistant/migrations/002_create_call_sessions.sql`

**Step 1: Write migration SQL**

Create the migration file:

```sql
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
```

**Step 2: Apply migration to Supabase**

Run the migration:

```bash
# If using local Supabase CLI
supabase db push

# Or manually apply via Supabase dashboard SQL editor
# Copy the SQL file contents and execute
```

Expected: Table `call_sessions` created with 3 indexes

**Step 3: Verify table structure**

Query to verify:

```bash
# Using the execute_sql MCP tool or psql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'call_sessions'
ORDER BY ordinal_position;
```

Expected output: 16 columns including id, user_id, direction, briefing, etc.

**Step 4: Verify indexes**

Query to verify indexes:

```bash
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'call_sessions';
```

Expected: 4 indexes (PRIMARY KEY + 3 custom indexes)

**Step 5: Commit**

```bash
git add server/assistant/migrations/002_create_call_sessions.sql
git commit -m "feat: add call_sessions table for unified call tracking

- New table tracks all calls (inbound/outbound)
- Includes briefing JSONB for pre-call context from Claude SDK
- Includes outcome_assessment JSONB for post-call analysis
- Links to interactions table via interaction_id
- Indexes for efficient querying by user, status, and interaction

Part of call briefing and history tracking feature.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Claude SDK MCP Tools

### Task 2: Add `create_briefed_call` MCP Tool

**Files:**
- Modify: `server/claude-orchestrator/index.js` (add new tool around line 50-150 where other tools are defined)

**Step 1: Add the new MCP tool**

Add after existing tools (e.g., after `send_sms` tool):

```javascript
// Tool: create_briefed_call
server.tool(
  'create_briefed_call',
  'Schedule a voice call with comprehensive briefing for the voice agent',
  {
    userId: z.string().uuid().describe('UUID of the user to call'),
    callType: z.enum([
      'scolding',
      'motivational-wakeup',
      'task-reminder',
      'morning-briefing',
      'wind-down-reflection'
    ]).describe('Type of call to schedule'),
    scheduledFor: z.string().datetime().describe('ISO 8601 datetime when call should occur'),
    briefing: z.object({
      trigger_reason: z.string().describe('Why this call was scheduled'),
      detected_patterns: z.array(z.string()).describe('Behavioral patterns observed that led to scheduling'),
      conversation_goals: z.array(z.string()).describe('What the voice agent should accomplish in this call'),
      recent_context: z.string().describe('Relevant recent user state or events')
    }).describe('Strategic context for the voice agent')
  },
  async (args) => {
    try {
      const { userId, callType, scheduledFor, briefing } = args;

      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          user_id: userId,
          direction: 'outbound',
          call_type: callType,
          scheduled_for: scheduledFor,
          scheduled_by: 'claude-sdk',
          status: 'scheduled',
          briefing: briefing
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating briefed call:', error);
        throw new Error(`Failed to create call session: ${error.message}`);
      }

      console.log(`✓ Call session created: ${data.id} (${callType} at ${scheduledFor})`);
      console.log(`  Trigger: ${briefing.trigger_reason}`);

      return {
        content: [{
          type: 'text',
          text: `Call scheduled successfully!\n\nType: ${callType}\nScheduled for: ${scheduledFor}\nSession ID: ${data.id}\n\nBriefing:\n- Trigger: ${briefing.trigger_reason}\n- Patterns: ${briefing.detected_patterns.join(', ')}\n- Goals: ${briefing.conversation_goals.join(', ')}`
        }]
      };
    } catch (error) {
      console.error('Error in create_briefed_call:', error);
      throw error;
    }
  }
);
```

**Step 2: Verify tool registration**

Add logging to confirm tool is registered:

```bash
# Start the assistant server and check logs
npm run assistant:dev
```

Expected log output: Tool `create_briefed_call` registered in MCP server initialization

**Step 3: Test tool manually (optional but recommended)**

Create a test script:

```bash
# Create: test-create-briefed-call.js
import { supabase } from './server/assistant/config/supabase.js';

async function testCreateBriefedCall() {
  const testUserId = '<your-test-user-uuid>';
  const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

  const { data, error } = await supabase
    .from('call_sessions')
    .insert({
      user_id: testUserId,
      direction: 'outbound',
      call_type: 'motivational-wakeup',
      scheduled_for: scheduledTime,
      scheduled_by: 'claude-sdk',
      status: 'scheduled',
      briefing: {
        trigger_reason: 'User skipped morning workout 3 days in a row',
        detected_patterns: ['stress-induced avoidance', 'morning procrastination'],
        conversation_goals: ['Get specific commitment for today', 'Identify barriers'],
        recent_context: 'Had good sleep last night, no early meetings today'
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

testCreateBriefedCall();
```

Run test:

```bash
node test-create-briefed-call.js
```

Expected: Session created in database with briefing populated

**Step 4: Commit**

```bash
git add server/claude-orchestrator/index.js
git commit -m "feat: add create_briefed_call MCP tool for Claude SDK

- New tool allows SDK to schedule calls with strategic briefing
- Briefing includes trigger_reason, detected_patterns, goals, context
- Creates entry in call_sessions table with status 'scheduled'
- Scheduler will pick up these sessions and pass context to voice agent

Part of call briefing and history tracking feature.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Add `update_call_outcome` MCP Tool

**Files:**
- Modify: `server/claude-orchestrator/index.js` (add after `create_briefed_call`)

**Step 1: Add the update_call_outcome tool**

```javascript
// Tool: update_call_outcome
server.tool(
  'update_call_outcome',
  'Update call session with summary and outcome assessment after call completes',
  {
    sessionId: z.string().uuid().optional().describe('Call session ID (if known)'),
    interactionId: z.string().uuid().optional().describe('Interaction ID (alternative lookup)'),
    summary: z.string().describe('2-3 sentence summary of conversation: key points, commitments, emotional state'),
    outcome: z.object({
      goal_achieved: z.boolean().describe('Whether the conversation goals were accomplished'),
      effectiveness: z.enum(['high', 'medium', 'low']).describe('How effective was this intervention'),
      follow_up_needed: z.boolean().describe('Does this call require a follow-up'),
      follow_up_action: z.string().optional().describe('What follow-up action to take'),
      user_satisfaction: z.number().min(1).max(5).optional().describe('Estimated user satisfaction (1-5)')
    }).describe('Structured outcome assessment')
  },
  async (args) => {
    try {
      const { sessionId, interactionId, summary, outcome } = args;

      // Must provide at least one identifier
      if (!sessionId && !interactionId) {
        throw new Error('Must provide either sessionId or interactionId');
      }

      // Build where clause based on what's provided
      const whereClause = sessionId
        ? { id: sessionId }
        : { interaction_id: interactionId };

      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          conversation_summary: summary,
          outcome_assessment: outcome,
          updated_at: new Date().toISOString()
        })
        .match(whereClause)
        .select()
        .single();

      if (error) {
        console.error('Error updating call outcome:', error);
        throw new Error(`Failed to update call session: ${error.message}`);
      }

      console.log(`✓ Call session ${data.id} updated with outcome`);
      console.log(`  Effectiveness: ${outcome.effectiveness}`);
      console.log(`  Goal achieved: ${outcome.goal_achieved}`);

      return {
        content: [{
          type: 'text',
          text: `Call outcome updated successfully!\n\nSession ID: ${data.id}\nSummary: ${summary}\n\nOutcome:\n- Goal achieved: ${outcome.goal_achieved}\n- Effectiveness: ${outcome.effectiveness}\n- Follow-up needed: ${outcome.follow_up_needed}`
        }]
      };
    } catch (error) {
      console.error('Error in update_call_outcome:', error);
      throw error;
    }
  }
);
```

**Step 2: Verify tool registration**

Restart server and check logs:

```bash
npm run assistant:dev
```

Expected: Tool `update_call_outcome` appears in registered tools list

**Step 3: Test tool manually**

Create test script:

```bash
# Create: test-update-call-outcome.js
import { supabase } from './server/assistant/config/supabase.js';

async function testUpdateCallOutcome() {
  const testSessionId = '<session-id-from-previous-test>';

  const { data, error } = await supabase
    .from('call_sessions')
    .update({
      conversation_summary: 'User committed to going to gym at 7am tomorrow. Identified barrier was lack of motivation after work stress. Agreed to prep gym bag tonight.',
      outcome_assessment: {
        goal_achieved: true,
        effectiveness: 'high',
        follow_up_needed: true,
        follow_up_action: 'Check in tomorrow at 8am to confirm gym attendance',
        user_satisfaction: 4
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', testSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

testUpdateCallOutcome();
```

Run test:

```bash
node test-update-call-outcome.js
```

Expected: Session updated with summary and outcome_assessment

**Step 4: Commit**

```bash
git add server/claude-orchestrator/index.js
git commit -m "feat: add update_call_outcome MCP tool for Claude SDK

- New tool updates call sessions with post-call analysis
- Accepts summary (conversation key points) and structured outcome
- Can query by sessionId or interactionId
- Tracks goal achievement, effectiveness, and follow-up needs

Part of call briefing and history tracking feature.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Update `processCallCompletion` to Use Call Sessions

**Files:**
- Modify: `server/claude-orchestrator/processors/callCompletionProcessor.js`

**Step 1: Read current implementation**

```bash
# Verify current code structure
cat server/claude-orchestrator/processors/callCompletionProcessor.js | head -50
```

**Step 2: Update to query call_sessions and include briefing context**

Modify the `processCallCompletion` function:

```javascript
import { supabase } from '../../assistant/config/supabase.js';

export async function processCallCompletion(interaction, mcpServers) {
  try {
    const { id: interactionId, user_id, call_type, transcript } = interaction;

    console.log(`🧠 Processing call completion for interaction ${interactionId}`);

    // Find associated call_session (if exists)
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('interaction_id', interactionId)
      .maybeSingle();

    if (sessionError) {
      console.error('Error querying call_sessions:', sessionError);
    }

    // Get or create session for this user
    const sessionId = await sessionManager.getOrCreateSession(user_id);

    // Build analysis prompt with session context
    async function* contextGenerator() {
      let briefingContext = '';

      if (session?.briefing) {
        briefingContext = `
ORIGINAL CALL BRIEFING (why this call was scheduled):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger: ${session.briefing.trigger_reason}

Detected Patterns:
${session.briefing.detected_patterns.map(p => `  • ${p}`).join('\n')}

Conversation Goals:
${session.briefing.conversation_goals.map(g => `  • ${g}`).join('\n')}

Recent Context:
${session.briefing.recent_context}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please assess how well the conversation achieved these original goals.
`;
      }

      yield {
        type: 'user',
        message: {
          role: 'user',
          content: `You are Luna's strategic planning system. A ${call_type} call just completed.

${briefingContext}

CALL TRANSCRIPT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${transcript}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS:
1. Analyze this interaction for behavioral patterns, commitments, and emotional state
2. Write a conversation_summary (2-3 sentences) covering key points and user state
3. Assess the outcome against the original goals (if this was a scheduled call with a briefing)
4. Determine if follow-up action is needed
5. Use the update_call_outcome tool to save your analysis${session ? ` (session ID: ${session.id})` : ` (interaction ID: ${interactionId})`}
6. If follow-up is needed, use create_briefed_call to schedule it

Available tools:
- update_call_outcome: Save your analysis
- create_briefed_call: Schedule follow-up calls
- query_user_data: Look up additional context if needed
- send_sms: Send immediate text message if urgent

Take action now using the appropriate tools.`
        }
      };
    }

    // Run SDK query with streaming
    const conversationHistory = contextGenerator();
    const result = await mcpServers.query(conversationHistory, {
      sessionId,
      streaming: true
    });

    console.log(`✓ Call completion analysis finished for ${interactionId}`);
    return result;

  } catch (error) {
    console.error('Error in processCallCompletion:', error);
    throw error;
  }
}
```

**Step 3: Verify imports**

Ensure supabase is imported at the top of the file:

```javascript
import { supabase } from '../../assistant/config/supabase.js';
```

**Step 4: Test with a real interaction**

```bash
# Restart assistant server
npm run assistant:dev

# Trigger a test call or wait for next scheduled call
# Check logs for "Processing call completion for interaction..."
```

Expected: Logs show briefing context being included in Claude SDK prompt

**Step 5: Commit**

```bash
git add server/claude-orchestrator/processors/callCompletionProcessor.js
git commit -m "feat: enhance call completion processor with briefing context

- Query call_sessions table to find associated session
- Include original briefing in Claude SDK analysis prompt
- Instruct SDK to assess outcome against original goals
- Provide sessionId to update_call_outcome tool for easier linking

Enables Claude SDK to evaluate intervention effectiveness.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: Scheduler Service Updates

### Task 5: Update Scheduler to Use `call_sessions` Table

**Files:**
- Modify: `server/assistant/services/scheduler.js:449-575` (processOrchestratorScheduledCalls method)

**Step 1: Read current scheduler implementation**

```bash
cat server/assistant/services/scheduler.js | sed -n '449,575p'
```

**Step 2: Replace processOrchestratorScheduledCalls method**

Find the method around line 449 and replace with:

```javascript
async processOrchestratorScheduledCalls() {
  try {
    const now = new Date();

    // Query call_sessions instead of scheduled_calls
    const { data: sessions, error } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('status', 'scheduled')
      .eq('direction', 'outbound')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error querying call_sessions:', error);
      return;
    }

    if (!sessions || sessions.length === 0) {
      return;
    }

    console.log(`🤖 ORCHESTRATOR: ${sessions.length} scheduled call(s) due`);

    for (const session of sessions) {
      try {
        // Get user phone from MongoDB
        const User = mongoose.model('User');
        const user = await User.findById(session.user_id);

        if (!user) {
          console.error(`User not found for session ${session.id}`);
          await this.markSessionFailed(session.id, 'User not found in database');
          continue;
        }

        if (!user.phone) {
          console.error(`No phone number for user ${session.user_id}`);
          await this.markSessionFailed(session.id, 'User has no phone number');
          continue;
        }

        // Build webhook URL with sessionId (KEY CHANGE!)
        const baseUrl = process.env.DOMAIN?.startsWith('http')
          ? process.env.DOMAIN
          : `https://${process.env.DOMAIN}`;

        let webhookUrl;

        switch (session.call_type) {
          case 'motivational-wakeup':
            webhookUrl = `${baseUrl}/assistant/voice/motivational-wakeup?sessionId=${session.id}`;
            break;

          case 'scolding':
            webhookUrl = `${baseUrl}/assistant/voice/scolding?sessionId=${session.id}`;
            break;

          case 'morning-briefing':
            webhookUrl = `${baseUrl}/assistant/voice/morning-briefing?sessionId=${session.id}`;
            break;

          case 'task-reminder':
            webhookUrl = `${baseUrl}/assistant/voice/task-reminder?sessionId=${session.id}`;
            break;

          case 'wind-down-reflection':
            webhookUrl = `${baseUrl}/assistant/voice/wind-down?sessionId=${session.id}`;
            break;

          default:
            console.error(`Unknown call type: ${session.call_type}`);
            await this.markSessionFailed(session.id, `Unknown call type: ${session.call_type}`);
            continue;
        }

        console.log(`📞 Initiating ${session.call_type} call for session ${session.id}`);
        if (session.briefing?.trigger_reason) {
          console.log(`   Reason: ${session.briefing.trigger_reason}`);
        }

        // Update status to in-progress BEFORE making call
        await supabase
          .from('call_sessions')
          .update({
            status: 'in-progress',
            started_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', session.id);

        // Make the Twilio call
        const twilioService = require('./twilioService');
        await twilioService.makeCall(user.phone, webhookUrl);

        console.log(`✓ Call initiated successfully for session ${session.id}`);

      } catch (callError) {
        console.error(`Error executing session ${session.id}:`, callError.message);
        await this.markSessionFailed(session.id, callError.message);
      }
    }
  } catch (error) {
    console.error('Error in processOrchestratorScheduledCalls:', error);
  }
}

async markSessionFailed(sessionId, reason) {
  try {
    await supabase
      .from('call_sessions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        outcome_assessment: {
          error: reason,
          goal_achieved: false,
          effectiveness: 'low'
        }
      })
      .eq('id', sessionId);

    console.log(`✗ Session ${sessionId} marked as failed: ${reason}`);
  } catch (error) {
    console.error(`Error marking session ${sessionId} as failed:`, error);
  }
}
```

**Step 3: Verify scheduler runs without errors**

```bash
# Restart assistant server
npm run assistant:dev

# Wait for scheduler tick (runs every minute by default)
# Check logs for "ORCHESTRATOR: X scheduled call(s) due"
```

Expected: Scheduler queries call_sessions table and passes sessionId in webhook URLs

**Step 4: Test with a scheduled session**

```bash
# Create a test session scheduled for 1 minute from now
node test-create-briefed-call.js

# Wait for scheduler to pick it up
# Verify logs show sessionId being passed to voice endpoint
```

**Step 5: Commit**

```bash
git add server/assistant/services/scheduler.js
git commit -m "feat: update scheduler to use call_sessions table

- Query call_sessions instead of scheduled_calls
- Pass sessionId in webhook URL query params
- Update session status to 'in-progress' before calling
- Add markSessionFailed helper for error handling
- Log briefing trigger_reason for visibility

Enables voice agent to receive sessionId and load briefing.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: Voice Service Integration

### Task 6: Update Voice Endpoints to Accept and Load sessionId

**Files:**
- Modify: `server/assistant/routes/voice.js` (all voice endpoint handlers)

**Step 1: Read current voice route structure**

```bash
# Find voice routes
grep -n "router.post.*voice" server/assistant/routes/voice.js
```

**Step 2: Update motivational-wakeup endpoint (example pattern)**

Find the `/voice/motivational-wakeup` route and update:

```javascript
router.post('/voice/motivational-wakeup', async (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.query.userId; // May still get userId for backward compat

    console.log(`📞 Motivational wakeup call requested (sessionId: ${sessionId || 'none'})`);

    // Load briefing if sessionId provided
    let briefingContext = null;
    if (sessionId) {
      const { data: session, error } = await supabase
        .from('call_sessions')
        .select('briefing, user_id')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error(`Error loading session ${sessionId}:`, error);
      } else if (session?.briefing) {
        briefingContext = session.briefing;
        console.log(`✓ Loaded briefing for session ${sessionId}`);
        console.log(`  Trigger: ${briefingContext.trigger_reason}`);
      }
    }

    // Build stream URL with sessionId
    const streamUrl = `wss://${req.headers.host}/assistant/voice/stream?sessionId=${sessionId || ''}&callType=motivational-wakeup`;

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${streamUrl}" />
  </Start>
  <Pause length="3600"/>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error in motivational-wakeup endpoint:', error);
    res.status(500).send('Internal server error');
  }
});
```

**Step 3: Update remaining voice endpoints with same pattern**

Apply the same pattern to:
- `/voice/scolding`
- `/voice/task-reminder`
- `/voice/morning-briefing`
- `/voice/wind-down`

**Step 4: Verify endpoints return correct TwiML**

```bash
# Test endpoint manually
curl -X POST "http://localhost:5001/assistant/voice/motivational-wakeup?sessionId=test-123"
```

Expected: TwiML with stream URL containing sessionId parameter

**Step 5: Commit**

```bash
git add server/assistant/routes/voice.js
git commit -m "feat: update voice endpoints to accept sessionId parameter

- All voice endpoints now accept sessionId query param
- Load briefing from call_sessions table if sessionId provided
- Pass sessionId to WebSocket stream URL
- Log briefing trigger_reason for debugging

Prepares voice endpoints to receive briefing context.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Update WebSocket Handler to Inject Briefing into System Prompt

**Files:**
- Modify: `server/assistant/services/voiceService.js` (WebSocket connection handler)

**Step 1: Locate WebSocket connection setup**

```bash
# Find where system prompt is built
grep -n "systemPrompt\|instructions" server/assistant/services/voiceService.js | head -20
```

**Step 2: Add sessionId to VoiceSession class**

Find the VoiceSession class constructor and add sessionId:

```javascript
class VoiceSession {
  constructor(ws, userId, callSid, streamSid, callType, sessionId = null) {
    this.ws = ws;
    this.userId = userId;
    this.callSid = callSid;
    this.streamSid = streamSid;
    this.callType = callType;
    this.sessionId = sessionId; // NEW
    this.openAIWs = null;
    this.transcript = '';
    this.callStartTime = new Date();
  }

  // ... rest of class
}
```

**Step 3: Load briefing and enhance system prompt**

Find where the OpenAI Realtime session is configured and update:

```javascript
async initializeOpenAI() {
  try {
    // Load briefing if sessionId provided
    let briefing = null;
    if (this.sessionId) {
      const { data: session, error } = await supabase
        .from('call_sessions')
        .select('briefing')
        .eq('id', this.sessionId)
        .single();

      if (error) {
        console.error(`Error loading briefing for session ${this.sessionId}:`, error);
      } else {
        briefing = session?.briefing;
        console.log(`✓ Loaded briefing for voice session`);
      }
    }

    // Build base system prompt for call type
    let systemPrompt = this.getBaseSystemPrompt(this.callType);

    // Inject briefing context
    if (briefing) {
      systemPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALL BRIEFING (Context from Strategic Planning System):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're calling because: ${briefing.trigger_reason}

Behavioral patterns I've observed:
${briefing.detected_patterns.map(p => `• ${p}`).join('\n')}

Your conversation goals for this call:
${briefing.conversation_goals.map(g => `• ${g}`).join('\n')}

Recent context to keep in mind:
${briefing.recent_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this context to have a focused, personalized conversation. Reference the patterns and context naturally in your conversation. Make sure to address the goals.`;
    }

    // Configure OpenAI Realtime session with enhanced prompt
    const sessionConfig = {
      modalities: ['text', 'audio'],
      instructions: systemPrompt,
      voice: 'alloy',
      input_audio_format: 'g711_ulaw',
      output_audio_format: 'g711_ulaw',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    };

    // Send session update to OpenAI
    this.sendToOpenAI({
      type: 'session.update',
      session: sessionConfig
    });

    console.log(`✓ OpenAI session configured with ${briefing ? 'briefed' : 'standard'} system prompt`);
  } catch (error) {
    console.error('Error initializing OpenAI session:', error);
    throw error;
  }
}

getBaseSystemPrompt(callType) {
  // Return base prompts for each call type
  const prompts = {
    'motivational-wakeup': `You are Luna, an enthusiastic and caring personal assistant...`,
    'scolding': `You are Luna, a firm but caring accountability partner...`,
    'morning-briefing': `You are Luna, a professional and organized personal assistant...`,
    'task-reminder': `You are Luna, a friendly reminder assistant...`,
    'wind-down-reflection': `You are Luna, a calming evening reflection guide...`
  };

  return prompts[callType] || prompts['motivational-wakeup'];
}
```

**Step 4: Update WebSocket connection handler to extract sessionId**

Find where VoiceSession is instantiated:

```javascript
// In WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const sessionId = url.searchParams.get('sessionId');
  const callType = url.searchParams.get('callType') || 'user-initiated';

  console.log(`WebSocket connected (sessionId: ${sessionId || 'none'}, callType: ${callType})`);

  // Store sessionId for later use
  ws.sessionId = sessionId;
  ws.callType = callType;

  ws.on('message', async (message) => {
    // Handle Twilio events...
    // When creating VoiceSession, pass sessionId:
    const session = new VoiceSession(ws, userId, callSid, streamSid, callType, sessionId);
    // ...
  });
});
```

**Step 5: Test briefing injection**

```bash
# Create a test session with briefing
node test-create-briefed-call.js

# Wait for scheduler to trigger call
# Answer the call and verify agent mentions the briefing context
# Check logs for "Loaded briefing for voice session"
```

Expected: Voice agent demonstrates awareness of briefing in first 10 seconds of call

**Step 6: Commit**

```bash
git add server/assistant/services/voiceService.js
git commit -m "feat: inject call briefing into voice agent system prompt

- VoiceSession accepts sessionId parameter
- Load briefing from call_sessions on initialization
- Inject briefing context into OpenAI system prompt
- Agent receives trigger_reason, patterns, goals, and recent context
- Enhanced logging for briefing load confirmation

Enables personalized, context-aware voice conversations.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Link Interactions to Call Sessions on Cleanup

**Files:**
- Modify: `server/assistant/services/voiceService.js` (VoiceSession cleanup method)

**Step 1: Find the cleanup/saveInteraction method**

```bash
grep -n "cleanup\|saveInteraction" server/assistant/services/voiceService.js
```

**Step 2: Update cleanup method to link interaction and create inbound sessions**

Find the cleanup method and update:

```javascript
async cleanup() {
  try {
    console.log(`🧹 Cleaning up voice session (callSid: ${this.callSid})`);

    // Save interaction to database (existing code)
    const interaction = await this.saveInteraction();

    if (!interaction) {
      console.error('Failed to save interaction');
      return;
    }

    console.log(`✓ Interaction saved: ${interaction.id}`);

    // Link to call_session or create new session
    if (this.sessionId) {
      // OUTBOUND CALL: Update existing session with interaction_id
      const { error } = await supabase
        .from('call_sessions')
        .update({
          interaction_id: interaction.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.sessionId);

      if (error) {
        console.error(`Error linking interaction to session ${this.sessionId}:`, error);
      } else {
        console.log(`✓ Linked interaction ${interaction.id} to session ${this.sessionId}`);
      }
    } else {
      // INBOUND CALL: Create new call_session
      const { data: newSession, error } = await supabase
        .from('call_sessions')
        .insert({
          user_id: this.userId,
          direction: 'inbound',
          call_type: this.callType === 'user-initiated' ? 'user-initiated' : this.callType,
          status: 'completed',
          interaction_id: interaction.id,
          started_at: this.callStartTime,
          completed_at: new Date().toISOString(),
          scheduled_by: null,
          briefing: null // No briefing for user-initiated calls
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating inbound call session:', error);
      } else {
        console.log(`✓ Created inbound call session: ${newSession.id}`);
      }
    }

    // Trigger Claude SDK analysis (existing code)
    await this.triggerClaudeSDKAnalysis(interaction);

  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

async saveInteraction() {
  try {
    // Existing interaction save logic
    const { data, error } = await supabase
      .from('interactions')
      .insert({
        user_id: this.userId,
        type: 'voice_outbound', // or determine based on direction
        direction: this.sessionId ? 'outbound' : 'inbound',
        content: {
          transcript: this.transcript,
          call_sid: this.callSid,
          stream_sid: this.streamSid,
          call_type: this.callType
        },
        metadata: {
          duration_seconds: Math.floor((new Date() - this.callStartTime) / 1000),
          call_started_at: this.callStartTime.toISOString(),
          call_ended_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving interaction:', error);
    return null;
  }
}
```

**Step 3: Verify interaction linking**

```bash
# Restart server
npm run assistant:dev

# Make a test call (either direction)
# Check logs for "Linked interaction X to session Y" or "Created inbound call session"
```

**Step 4: Query database to verify**

```bash
# Check that interaction_id is populated
SELECT id, direction, call_type, interaction_id, created_at
FROM call_sessions
ORDER BY created_at DESC
LIMIT 5;
```

Expected: Each call_session has interaction_id populated

**Step 5: Commit**

```bash
git add server/assistant/services/voiceService.js
git commit -m "feat: link interactions to call_sessions on cleanup

- Outbound calls: update existing session with interaction_id
- Inbound calls: create new call_session record
- Track both directions in unified call_sessions table
- Set status to 'completed' and record timing

Enables unified call history tracking for all interactions.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5: Testing & Verification

### Task 9: End-to-End Testing of Briefing Flow

**Files:**
- Create: `test-briefing-flow-e2e.js`

**Step 1: Write comprehensive test script**

```javascript
#!/usr/bin/env node

/**
 * End-to-end test for call briefing and history tracking
 *
 * Tests the complete flow:
 * 1. Create briefed call via MCP tool (simulate Claude SDK)
 * 2. Scheduler picks it up and passes sessionId
 * 3. Voice agent loads briefing and uses it
 * 4. Interaction is linked to session
 * 5. Outcome is assessed and saved
 */

import { supabase } from './server/assistant/config/supabase.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const TEST_USER_ID = process.env.TEST_USER_ID; // Set this to a valid user UUID
const SCHEDULED_DELAY_MS = 120000; // Schedule call 2 minutes from now

async function runE2ETest() {
  console.log('🧪 Starting end-to-end briefing flow test\n');

  try {
    // Step 1: Create a briefed call session
    console.log('Step 1: Creating briefed call session...');

    const scheduledTime = new Date(Date.now() + SCHEDULED_DELAY_MS);
    const { data: session, error: createError } = await supabase
      .from('call_sessions')
      .insert({
        user_id: TEST_USER_ID,
        direction: 'outbound',
        call_type: 'motivational-wakeup',
        scheduled_for: scheduledTime.toISOString(),
        scheduled_by: 'test-script',
        status: 'scheduled',
        briefing: {
          trigger_reason: 'User skipped morning workout for 3 consecutive days',
          detected_patterns: [
            'Evening stress leading to morning avoidance',
            'No accountability partner for workout commitments'
          ],
          conversation_goals: [
            'Get specific time commitment for today\'s workout',
            'Identify primary barrier preventing consistency',
            'Establish simple accountability mechanism'
          ],
          recent_context: 'User had good sleep last night (8 hours), no early meetings scheduled, weather is clear'
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create session:', createError);
      return;
    }

    console.log(`✓ Session created: ${session.id}`);
    console.log(`  Scheduled for: ${scheduledTime.toLocaleString()}`);
    console.log(`  Trigger: ${session.briefing.trigger_reason}\n`);

    // Step 2: Verify session is queryable
    console.log('Step 2: Verifying session is queryable...');

    const { data: queriedSession, error: queryError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    if (queryError || !queriedSession) {
      console.error('❌ Failed to query session:', queryError);
      return;
    }

    console.log(`✓ Session queryable with briefing intact\n`);

    // Step 3: Simulate scheduler query
    console.log('Step 3: Simulating scheduler query...');

    // Query for sessions due now (should not include our test session yet)
    const { data: dueSessions } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString());

    console.log(`✓ Current due sessions: ${dueSessions?.length || 0}`);
    console.log(`  (Test session will be due in ${Math.floor(SCHEDULED_DELAY_MS / 60000)} minutes)\n`);

    // Step 4: Instructions for manual verification
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('NEXT STEPS FOR MANUAL VERIFICATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`1. Wait for call to be initiated by scheduler (in ~${Math.floor(SCHEDULED_DELAY_MS / 60000)} min)`);
    console.log(`2. Answer the call and listen for briefing context in first 10 seconds`);
    console.log(`3. Agent should mention:`);
    console.log(`   - Why calling: "skipped morning workout"`);
    console.log(`   - Pattern awareness: "stress" or "accountability"`);
    console.log(`   - Specific goal: ask for commitment\n`);

    console.log(`4. After call ends, verify session was updated:`);
    console.log(`   \`\`\``);
    console.log(`   SELECT * FROM call_sessions WHERE id = '${session.id}';`);
    console.log(`   \`\`\``);
    console.log(`   Expected: status = 'completed', interaction_id populated\n`);

    console.log(`5. Check Claude SDK analysis:`);
    console.log(`   \`\`\``);
    console.log(`   SELECT conversation_summary, outcome_assessment FROM call_sessions WHERE id = '${session.id}';`);
    console.log(`   \`\`\``);
    console.log(`   Expected: summary and assessment populated within 30 seconds of call end\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 5: Cleanup option
    console.log('To cancel this test call, run:');
    console.log(`  DELETE FROM call_sessions WHERE id = '${session.id}';\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runE2ETest();
```

**Step 2: Make script executable and run**

```bash
chmod +x test-briefing-flow-e2e.js
node test-briefing-flow-e2e.js
```

Expected: Test session created, instructions printed for manual verification

**Step 3: Execute manual verification steps**

Follow the printed instructions to:
1. Wait for call
2. Answer and verify briefing context
3. Query database to confirm linking
4. Verify Claude SDK analysis ran

**Step 4: Document test results**

Create test results file:

```bash
# Create: docs/test-results-briefing-flow.md
echo "# Briefing Flow Test Results

Date: $(date)

## Test Execution

- [x] Session created with briefing
- [ ] Scheduler picked up session at scheduled time
- [ ] Voice endpoint received sessionId
- [ ] Briefing loaded successfully
- [ ] Agent mentioned briefing context in call
- [ ] Interaction linked to session
- [ ] Claude SDK analysis completed
- [ ] Outcome assessment populated

## Observations

[Add notes here after test]

" > docs/test-results-briefing-flow.md
```

**Step 5: Commit test**

```bash
git add test-briefing-flow-e2e.js docs/test-results-briefing-flow.md
git commit -m "test: add end-to-end test for call briefing flow

- Creates test session with full briefing
- Provides manual verification checklist
- Covers complete flow from scheduling to outcome assessment
- Documents test results

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Create Query Helper Functions

**Files:**
- Create: `server/assistant/utils/callSessionQueries.js`

**Step 1: Write reusable query helpers**

```javascript
/**
 * Helper functions for querying call_sessions
 *
 * Provides convenient methods for common call history queries
 */

import { supabase } from '../config/supabase.js';

/**
 * Get recent call history for a user
 */
export async function getRecentCallHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select(`
      id,
      direction,
      call_type,
      status,
      briefing,
      conversation_summary,
      outcome_assessment,
      scheduled_for,
      started_at,
      completed_at,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get effectiveness metrics for Claude SDK interventions
 */
export async function getInterventionEffectiveness(userId = null) {
  let query = supabase
    .from('call_sessions')
    .select('call_type, outcome_assessment')
    .eq('direction', 'outbound')
    .eq('scheduled_by', 'claude-sdk')
    .not('outcome_assessment', 'is', null);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by call_type and effectiveness
  const metrics = {};
  data.forEach(session => {
    const type = session.call_type;
    if (!metrics[type]) {
      metrics[type] = {
        total: 0,
        goal_achieved: 0,
        high_effectiveness: 0,
        medium_effectiveness: 0,
        low_effectiveness: 0
      };
    }

    metrics[type].total++;
    if (session.outcome_assessment.goal_achieved) {
      metrics[type].goal_achieved++;
    }

    const effectiveness = session.outcome_assessment.effectiveness;
    if (effectiveness === 'high') metrics[type].high_effectiveness++;
    else if (effectiveness === 'medium') metrics[type].medium_effectiveness++;
    else if (effectiveness === 'low') metrics[type].low_effectiveness++;
  });

  return metrics;
}

/**
 * Get calls that need follow-up
 */
export async function getCallsNeedingFollowUp(userId = null) {
  let query = supabase
    .from('call_sessions')
    .select('*')
    .eq('status', 'completed')
    .not('outcome_assessment', 'is', null);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter for those with follow_up_needed = true
  return data.filter(session =>
    session.outcome_assessment?.follow_up_needed === true
  );
}

/**
 * Get session by interaction ID
 */
export async function getSessionByInteractionId(interactionId) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('interaction_id', interactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get user's call success rate
 */
export async function getUserCallSuccessRate(userId) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select('outcome_assessment')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('outcome_assessment', 'is', null);

  if (error) throw error;

  if (data.length === 0) {
    return { total: 0, successful: 0, rate: 0 };
  }

  const successful = data.filter(s => s.outcome_assessment.goal_achieved).length;

  return {
    total: data.length,
    successful,
    rate: successful / data.length
  };
}
```

**Step 2: Write tests for query helpers**

```bash
# Create: test-call-session-queries.js
```

```javascript
import {
  getRecentCallHistory,
  getInterventionEffectiveness,
  getUserCallSuccessRate
} from './server/assistant/utils/callSessionQueries.js';

async function testQueries() {
  const testUserId = process.env.TEST_USER_ID;

  console.log('Testing recent call history...');
  const history = await getRecentCallHistory(testUserId, 5);
  console.log(`  Found ${history.length} recent calls`);

  console.log('\nTesting intervention effectiveness...');
  const metrics = await getInterventionEffectiveness(testUserId);
  console.log('  Metrics:', JSON.stringify(metrics, null, 2));

  console.log('\nTesting success rate...');
  const successRate = await getUserCallSuccessRate(testUserId);
  console.log(`  Success rate: ${(successRate.rate * 100).toFixed(1)}% (${successRate.successful}/${successRate.total})`);
}

testQueries().catch(console.error);
```

**Step 3: Run query tests**

```bash
node test-call-session-queries.js
```

Expected: Queries execute without errors and return structured data

**Step 4: Commit query helpers**

```bash
git add server/assistant/utils/callSessionQueries.js test-call-session-queries.js
git commit -m "feat: add call session query helper functions

- getRecentCallHistory: fetch user's call log
- getInterventionEffectiveness: aggregate metrics by call type
- getCallsNeedingFollowUp: find sessions requiring action
- getSessionByInteractionId: lookup by interaction
- getUserCallSuccessRate: calculate goal achievement rate

Provides reusable query functions for analytics and debugging.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: Documentation & Deployment

### Task 11: Update README with Briefing Flow Documentation

**Files:**
- Modify: `README.md`

**Step 1: Add new section to README**

Add after the existing voice features section:

```markdown
## Call Briefing and History Tracking

### Overview

The system now maintains comprehensive call tracking with bidirectional context flow between the Claude SDK orchestrator and OpenAI Realtime voice agent.

**Key Features:**
- **Pre-call briefings**: Voice agent receives strategic context before scheduled calls
- **Unified call history**: All calls (inbound and outbound) tracked in single table
- **Outcome tracking**: Post-call analysis with effectiveness metrics
- **Learning loop**: SDK can evaluate intervention success and adapt strategies

### How It Works

#### Outbound Calls (Claude SDK → Voice Agent)

1. **Claude SDK Analysis**: Detects pattern requiring intervention
2. **Create Briefing**: Uses `create_briefed_call` MCP tool with:
   - `trigger_reason`: Why this call is needed
   - `detected_patterns`: Behavioral observations
   - `conversation_goals`: What agent should accomplish
   - `recent_context`: Relevant user state
3. **Scheduler**: Picks up due calls, passes `sessionId` to voice endpoint
4. **Voice Agent**: Loads briefing, injects into system prompt
5. **Personalized Call**: Agent demonstrates awareness of context
6. **Link Interaction**: Call transcript linked to session
7. **Outcome Analysis**: SDK evaluates effectiveness, updates session

#### Inbound Calls (User → Voice Agent)

1. **User Calls**: Standard voice interaction
2. **Create Session**: New `call_sessions` entry with `direction='inbound'`
3. **Link Interaction**: Call transcript linked to session
4. **Analysis**: SDK analyzes conversation, may schedule follow-ups

### Database Schema

```sql
call_sessions
├── direction: 'inbound' | 'outbound'
├── call_type: type of call
├── briefing: JSONB - strategic context from SDK
├── interaction_id: link to full transcript
├── conversation_summary: key points from call
└── outcome_assessment: JSONB - effectiveness metrics
```

### Query Examples

**Recent call history:**
```javascript
import { getRecentCallHistory } from './server/assistant/utils/callSessionQueries.js';

const history = await getRecentCallHistory(userId, 10);
```

**Intervention effectiveness:**
```javascript
import { getInterventionEffectiveness } from './server/assistant/utils/callSessionQueries.js';

const metrics = await getInterventionEffectiveness(userId);
// Returns: { scolding: { total: 5, goal_achieved: 4, ... }, ... }
```

**Direct SQL:**
```sql
-- View recent calls with briefing context
SELECT
  direction,
  call_type,
  briefing->>'trigger_reason' as why_called,
  conversation_summary,
  outcome_assessment->>'effectiveness' as effectiveness,
  created_at
FROM call_sessions
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 10;
```

### Testing

Run end-to-end test:
```bash
node test-briefing-flow-e2e.js
```

This creates a test session, schedules a call, and provides verification checklist.
```

**Step 2: Commit README update**

```bash
git add README.md
git commit -m "docs: document call briefing and history tracking feature

- Add overview of bidirectional context flow
- Document outbound and inbound call flows
- Include database schema reference
- Provide query examples and testing instructions

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Create Migration Guide for Production Deployment

**Files:**
- Create: `docs/deployment/call-briefing-migration-guide.md`

**Step 1: Write deployment checklist**

```markdown
# Production Deployment Guide: Call Briefing and History Tracking

## Pre-Deployment Checklist

- [ ] Review all changes in feature branch
- [ ] Verify tests pass locally
- [ ] Database migration script tested on staging
- [ ] Environment variables verified (no new vars required)
- [ ] Backward compatibility confirmed (graceful degradation if sessionId missing)

## Deployment Steps

### 1. Database Migration (Zero Downtime)

**Action**: Apply `002_create_call_sessions.sql`

```bash
# Via Supabase dashboard:
# 1. Navigate to SQL Editor
# 2. Paste migration SQL
# 3. Execute

# Or via CLI:
supabase db push
```

**Verification**:
```sql
SELECT COUNT(*) FROM call_sessions;
-- Expected: 0 (table exists but empty)

SELECT indexname FROM pg_indexes WHERE tablename = 'call_sessions';
-- Expected: 4 indexes
```

**Rollback**: Table can be dropped without affecting existing functionality
```sql
DROP TABLE IF EXISTS call_sessions CASCADE;
```

---

### 2. Deploy Application Code

**Action**: Merge feature branch to main, deploy to Railway

```bash
git checkout main
git merge feature/call-briefing-history
git push origin main

# Railway will auto-deploy
# Monitor: https://railway.app/project/<project-id>/deployments
```

**Verification**:
- Check Railway logs for successful startup
- Verify no errors in scheduler logs
- Confirm MCP tools registered: `create_briefed_call`, `update_call_outcome`

**Rollback**: Revert to previous deployment in Railway dashboard

---

### 3. Test in Production

**Smoke Test Checklist**:

1. **Create test session**:
   ```bash
   node test-create-briefed-call.js
   ```
   Expected: Session created in database

2. **Verify scheduler picks it up**:
   Check Railway logs for: "ORCHESTRATOR: 1 scheduled call(s) due"

3. **Answer test call**:
   - Verify briefing context mentioned
   - Confirm call completes successfully

4. **Check session updated**:
   ```sql
   SELECT * FROM call_sessions
   WHERE status = 'completed'
   ORDER BY completed_at DESC
   LIMIT 1;
   ```
   Expected: `interaction_id` populated, `status = 'completed'`

5. **Verify Claude SDK analysis**:
   Wait 30 seconds, then:
   ```sql
   SELECT conversation_summary, outcome_assessment
   FROM call_sessions
   WHERE id = '<test-session-id>';
   ```
   Expected: Both fields populated

---

### 4. Monitor for Issues

**Key Metrics to Watch**:

1. **Database errors**: Check for FK constraint violations
2. **Scheduler errors**: "Unknown call type" or "User not found"
3. **Voice endpoint errors**: Failed to load briefing
4. **SDK analysis failures**: Claude SDK not updating outcomes

**Monitoring Queries**:

```sql
-- Failed sessions
SELECT id, call_type, outcome_assessment->>'error' as error
FROM call_sessions
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '1 hour';

-- Sessions missing outcomes (should be rare)
SELECT id, call_type, completed_at
FROM call_sessions
WHERE status = 'completed'
AND completed_at > NOW() - INTERVAL '1 hour'
AND outcome_assessment IS NULL;
```

---

## Rollback Plan

### If Critical Issue Detected:

1. **Revert Railway deployment** to previous version
2. **Leave database table** in place (no data loss)
3. **Investigate issue** in development environment
4. **Re-deploy** after fix

### Database Rollback (Only if Necessary):

```sql
-- WARNING: This will delete all call session data
DROP TABLE call_sessions CASCADE;
```

Note: Dropping the table does NOT affect existing functionality. The system will fall back to `scheduled_calls` table (if still present) or simply not track sessions.

---

## Post-Deployment Validation

**Success Criteria** (check after 24 hours):

- [ ] At least one outbound call completed with briefing
- [ ] At least one inbound call tracked
- [ ] 95%+ of completed calls have outcome_assessment
- [ ] No increase in error rate
- [ ] Scheduler still processing calls correctly

**Query for Validation**:

```sql
-- Call volume check
SELECT
  direction,
  COUNT(*) as total,
  COUNT(outcome_assessment) as with_assessment
FROM call_sessions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY direction;
```

Expected output:
```
direction  | total | with_assessment
-----------|-------|----------------
outbound   |   X   |   ~0.95*X
inbound    |   Y   |   ~0.95*Y
```

---

## Troubleshooting

### Issue: Sessions not being created

**Check**:
1. MCP tools registered: Check assistant server logs
2. Supabase permissions: Verify service key has INSERT on call_sessions

**Fix**: Restart assistant server, verify SUPABASE_SERVICE_KEY env var

---

### Issue: Briefing not loading in voice agent

**Check**:
1. sessionId in webhook URL: Check scheduler logs
2. sessionId received by voice endpoint: Check TwiML logs
3. Supabase query succeeds: Check voice service logs

**Fix**: Verify sessionId parameter passing through entire chain

---

### Issue: Interactions not linking to sessions

**Check**:
1. cleanup() method called: Check voice service logs
2. Supabase UPDATE succeeds: Check for FK constraint errors

**Fix**: Verify interaction_id exists before linking

---

## Contact

If issues arise during deployment:
- Check Railway logs: `railway logs --follow`
- Check Supabase logs: Dashboard > Logs
- Review recent commits: `git log --oneline -10`

```

**Step 2: Commit migration guide**

```bash
git add docs/deployment/call-briefing-migration-guide.md
git commit -m "docs: add production deployment guide for call briefing feature

- Pre-deployment checklist
- Step-by-step deployment instructions
- Rollback procedures
- Post-deployment validation queries
- Troubleshooting guide

Ensures safe production deployment with zero downtime.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final Commit & Summary

### Task 13: Final Integration Commit

**Step 1: Run final verification**

```bash
# Verify all files are committed
git status

# Run a quick syntax check
npm run assistant:start &
sleep 5
pkill -f assistant-server
```

**Step 2: Update implementation plan status**

Update this file (at the top) to mark as complete:

```markdown
**Status:** ✅ Implementation Complete
**Deployed:** [Date]
```

**Step 3: Create final summary commit**

```bash
git add docs/plans/2025-01-08-call-briefing-and-history-implementation.md
git commit -m "docs: mark call briefing implementation plan as complete

All phases implemented:
✓ Phase 1: call_sessions table created
✓ Phase 2: MCP tools added (create_briefed_call, update_call_outcome)
✓ Phase 3: Scheduler updated to use call_sessions
✓ Phase 4: Voice service integrated with briefing injection
✓ Phase 5: Tests created and executed
✓ Phase 6: Documentation completed

Ready for production deployment.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Execution Options

Plan complete and saved to `docs/plans/2025-01-08-call-briefing-and-history-implementation.md`.

**Two execution approaches:**

### 1. Subagent-Driven Development (This Session)
- I dispatch fresh subagent for each task
- Code review between tasks
- Fast iteration with quality gates
- **REQUIRED SUB-SKILL**: @superpowers:subagent-driven-development

### 2. Parallel Session Execution
- Open new Claude Code session in this worktree
- Use @superpowers:executing-plans skill
- Batch execution with review checkpoints

**Which approach would you like to use?**
