# Call Briefing and History Tracking Design

**Date:** January 8, 2025
**Status:** Design Phase
**Author:** Claude (via brainstorming session)

## Executive Summary

This design introduces comprehensive call tracking and briefing capabilities to enable bidirectional context flow between the Claude SDK orchestrator and the OpenAI Realtime voice agent. The system will track all calls (both user-initiated and SDK-scheduled) with rich context, enabling the voice agent to know WHY it's calling and the SDK to learn from call outcomes.

**Key Benefits:**
- Voice agent receives full briefing before scheduled calls (trigger reasons, detected patterns, conversation goals)
- Unified call history tracks all interactions with summaries and outcome assessments
- Claude SDK can learn from call effectiveness and adjust intervention strategies
- Complete visibility into the conversation loop for both user and system

## Problem Statement

### Current Limitations

**Post-call analysis works but pre-call briefing is missing:**
- When Claude SDK schedules a call, it has deep reasoning (detected patterns, trigger events, strategic goals)
- But the voice agent only gets minimal context via `custom_instructions` field (e.g., just "gym" or a taskId)
- The agent doesn't know WHY the SDK scheduled the call or what behavioral patterns triggered it

**Call history is fragmented:**
- `interactions` table has transcripts but no SDK reasoning or outcome tracking
- `scheduled_calls` table only tracks outbound SDK calls, not inbound user-initiated calls
- No unified view of the conversation history from both perspectives

**Learning loop is incomplete:**
- SDK schedules interventions but can't assess if they worked
- No feedback mechanism to track intervention effectiveness
- Can't improve scheduling strategies based on outcomes

## Architecture Overview

### Core Component: `call_sessions` Table

A new unified table that tracks ALL calls (both directions) with rich context throughout their lifecycle:

```
call_sessions
├── Scheduling phase: briefing from Claude SDK
├── Execution phase: links to voice interaction
└── Completion phase: summary + outcome assessment
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     OUTBOUND CALL FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. Claude SDK Analysis
   ↓
2. Create call_session with briefing
   {trigger_reason, detected_patterns, conversation_goals, recent_context}
   ↓
3. Scheduler picks up due call
   ↓
4. Voice agent loads briefing → personalized system prompt
   ↓
5. Call proceeds with full context
   ↓
6. Update call_session with interaction_id
   ↓
7. Claude SDK analyzes outcome → summary + assessment
   ↓
8. Update call_session with results
   ↓
9. SDK learns from effectiveness metrics


┌─────────────────────────────────────────────────────────────────┐
│                     INBOUND CALL FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. User initiates call
   ↓
2. Create call_session (direction='inbound', no briefing)
   ↓
3. Call proceeds (standard voice interaction)
   ↓
4. Link interaction to call_session
   ↓
5. Claude SDK analyzes (same as outbound)
   ↓
6. Update with summary + assessment
   ↓
7. SDK can schedule follow-ups based on conversation
```

## Data Model

### New Table: `call_sessions`

```sql
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Call metadata
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  call_type TEXT NOT NULL,
    -- Examples: 'scolding', 'motivational-wakeup', 'morning-briefing',
    --           'wind-down-reflection', 'task-reminder', 'user-initiated'
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in-progress', 'completed', 'failed', 'cancelled')),

  -- Pre-call briefing (populated by Claude SDK for outbound calls)
  briefing JSONB DEFAULT NULL,
    -- Structure: {
    --   trigger_reason: string,        -- Why this call was scheduled
    --   detected_patterns: string[],   -- Behavioral patterns observed
    --   conversation_goals: string[],  -- What agent should accomplish
    --   recent_context: string         -- Relevant recent user state
    -- }

  -- During/post-call data
  interaction_id UUID REFERENCES interactions(id), -- Links to full transcript
  conversation_summary TEXT,                       -- Key points, commitments, emotional state
  outcome_assessment JSONB DEFAULT NULL,
    -- Structure: {
    --   goal_achieved: boolean,
    --   effectiveness: 'high' | 'medium' | 'low',
    --   follow_up_needed: boolean,
    --   follow_up_action: string,
    --   user_satisfaction: number (1-5)
    -- }

  -- Scheduling information (for outbound calls)
  scheduled_for TIMESTAMP,
  scheduled_by TEXT, -- 'claude-sdk', 'cron-scheduler', 'manual'

  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_call_sessions_user_created ON call_sessions(user_id, created_at DESC);
CREATE INDEX idx_call_sessions_status_scheduled ON call_sessions(status, scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_call_sessions_interaction ON call_sessions(interaction_id)
  WHERE interaction_id IS NOT NULL;
```

### Relationship with Existing Tables

**`call_sessions` ↔ `interactions`:**
- One-to-one relationship via `interaction_id`
- `interactions` stores raw transcript and technical metadata
- `call_sessions` stores strategic context and outcome analysis

**`call_sessions` supersedes `scheduled_calls`:**
- Migration path: Copy existing `scheduled_calls` to `call_sessions` format
- `scheduled_calls` table can be deprecated after migration
- `call_sessions` is more comprehensive (tracks both directions, includes outcomes)

## Implementation Components

### 1. Claude SDK Changes

**New MCP Tool: `create_briefed_call`**

```javascript
tool(
  'create_briefed_call',
  'Schedule a call with comprehensive briefing for the voice agent',
  {
    userId: z.string().uuid(),
    callType: z.enum(['scolding', 'motivational-wakeup', 'task-reminder', 'morning-briefing', 'wind-down-reflection']),
    scheduledFor: z.string().datetime(),
    briefing: z.object({
      trigger_reason: z.string(),
      detected_patterns: z.array(z.string()),
      conversation_goals: z.array(z.string()),
      recent_context: z.string()
    })
  },
  async (args) => {
    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        user_id: args.userId,
        direction: 'outbound',
        call_type: args.callType,
        scheduled_for: args.scheduledFor,
        scheduled_by: 'claude-sdk',
        status: 'scheduled',
        briefing: args.briefing
      })
      .select()
      .single();

    if (error) throw error;

    return {
      content: [{
        type: 'text',
        text: `Call scheduled: ${args.callType} for ${args.scheduledFor}\nSession ID: ${data.id}`
      }]
    };
  }
)
```

**Updated `processCallCompletion` Function:**

```javascript
export async function processCallCompletion(interaction, mcpServers) {
  const { id: interactionId, user_id, call_type, transcript } = interaction;

  // Find associated call_session (if exists)
  const { data: session } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('interaction_id', interactionId)
    .single();

  // Build analysis prompt with session context
  async function* contextGenerator() {
    let briefingContext = '';
    if (session?.briefing) {
      briefingContext = `
ORIGINAL CALL BRIEFING (this is why the call was scheduled):
- Trigger: ${session.briefing.trigger_reason}
- Patterns: ${session.briefing.detected_patterns.join(', ')}
- Goals: ${session.briefing.conversation_goals.join(', ')}
- Context: ${session.briefing.recent_context}
`;
    }

    yield {
      type: 'user',
      message: {
        role: 'user',
        content: `You are Luna's strategic planning system. A ${call_type} call just completed.

${briefingContext}

CALL TRANSCRIPT:
"${transcript}"

INSTRUCTIONS:
1. Analyze this interaction for patterns, commitments, and emotional state
2. Write a conversation_summary (2-3 sentences) covering key points and user state
3. Assess outcome against the original goals (if this was a scheduled call)
4. Determine if follow-up is needed
5. Use tools to update the call session and schedule follow-ups if appropriate

Use your available tools to take actions.`
      }
    };
  }

  // Run SDK analysis (same as before, but now has briefing context)
  // ...
}
```

**New MCP Tool: `update_call_outcome`**

```javascript
tool(
  'update_call_outcome',
  'Update call session with summary and outcome assessment',
  {
    sessionId: z.string().uuid().optional(),
    interactionId: z.string().uuid().optional(),
    summary: z.string(),
    outcome: z.object({
      goal_achieved: z.boolean(),
      effectiveness: z.enum(['high', 'medium', 'low']),
      follow_up_needed: z.boolean(),
      follow_up_action: z.string().optional(),
      user_satisfaction: z.number().min(1).max(5).optional()
    })
  },
  async (args) => {
    const whereClause = args.sessionId
      ? { id: args.sessionId }
      : { interaction_id: args.interactionId };

    const { data, error } = await supabase
      .from('call_sessions')
      .update({
        conversation_summary: args.summary,
        outcome_assessment: args.outcome,
        updated_at: new Date().toISOString()
      })
      .match(whereClause)
      .select()
      .single();

    if (error) throw error;

    return {
      content: [{
        type: 'text',
        text: `Call session ${data.id} updated with outcome assessment`
      }]
    };
  }
)
```

### 2. Scheduler Service Changes

**Update `processOrchestratorScheduledCalls` to use `call_sessions`:**

```javascript
async processOrchestratorScheduledCalls() {
  try {
    const now = new Date();

    // Query call_sessions instead of scheduled_calls
    const { data: sessions, error } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true });

    if (error || !sessions || sessions.length === 0) {
      return;
    }

    console.log(`🤖 ORCHESTRATOR: ${sessions.length} scheduled call(s) due`);

    for (const session of sessions) {
      try {
        // Get user phone from MongoDB
        const user = await User.findById(session.user_id);
        if (!user) {
          await markSessionFailed(session.id, 'User not found');
          continue;
        }

        // Build webhook URL with sessionId (key change!)
        const baseUrl = process.env.DOMAIN.startsWith('http')
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
          // ... other call types
          default:
            await markSessionFailed(session.id, 'Unknown call type');
            continue;
        }

        // Update status to in-progress
        await supabase
          .from('call_sessions')
          .update({
            status: 'in-progress',
            started_at: now.toISOString()
          })
          .eq('id', session.id);

        // Make the call
        await twilioService.makeCall(user.phone, webhookUrl);

        console.log(`✓ Call initiated for session ${session.id}`);

      } catch (callError) {
        console.error(`Error executing session ${session.id}:`, callError.message);
        await markSessionFailed(session.id, callError.message);
      }
    }
  } catch (error) {
    console.error('Error in processOrchestratorScheduledCalls:', error);
  }
}

async function markSessionFailed(sessionId, reason) {
  await supabase
    .from('call_sessions')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      outcome_assessment: { error: reason }
    })
    .eq('id', sessionId);
}
```

### 3. Voice Service Changes

**Update voice endpoints to load and use briefing:**

```javascript
// Example: server/assistant/routes/voice.js

router.post('/voice/motivational-wakeup', async (req, res) => {
  const { sessionId } = req.query;

  let briefingContext = null;

  if (sessionId) {
    // Load briefing from call_sessions
    const { data: session } = await supabase
      .from('call_sessions')
      .select('briefing')
      .eq('id', sessionId)
      .single();

    if (session?.briefing) {
      briefingContext = session.briefing;
    }
  }

  // Generate TwiML with sessionId
  const twimlResponse = generateTwiMLForCall({
    callType: 'motivational-wakeup',
    streamUrl: `wss://${req.headers.host}/assistant/voice/stream?sessionId=${sessionId || ''}`,
    briefing: briefingContext
  });

  res.type('text/xml');
  res.send(twimlResponse);
});
```

**Update WebSocket handler to inject briefing into system prompt:**

```javascript
async handleVoiceStream(ws, userId, callSid, streamSid, sessionId = null) {
  // Load briefing if sessionId provided
  let briefing = null;
  if (sessionId) {
    const { data: session } = await supabase
      .from('call_sessions')
      .select('briefing')
      .eq('id', sessionId)
      .single();

    briefing = session?.briefing;
  }

  // Build system prompt with briefing
  let systemPrompt = getBaseSystemPrompt(callType);

  if (briefing) {
    systemPrompt += `

CALL BRIEFING:
You're calling because: ${briefing.trigger_reason}

Behavioral patterns observed:
${briefing.detected_patterns.map(p => `- ${p}`).join('\n')}

Your conversation goals:
${briefing.conversation_goals.map(g => `- ${g}`).join('\n')}

Recent context:
${briefing.recent_context}

Use this context to have a focused, personalized conversation.`;
  }

  // Continue with OpenAI Realtime connection using enhanced prompt
  // ...
}
```

**Update session tracking to link interaction:**

```javascript
async cleanup() {
  // Save interaction (already happens)
  const interaction = await this.saveInteraction();

  // Link to call_session if sessionId exists
  if (this.sessionId) {
    await supabase
      .from('call_sessions')
      .update({
        interaction_id: interaction.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', this.sessionId);
  } else {
    // Create new session for inbound call
    await supabase
      .from('call_sessions')
      .insert({
        user_id: this.userId,
        direction: 'inbound',
        call_type: 'user-initiated',
        status: 'completed',
        interaction_id: interaction.id,
        started_at: this.callStartTime,
        completed_at: new Date().toISOString()
      });
  }

  // Trigger Claude SDK analysis (already happens)
  await this.triggerClaudeSDKAnalysis(interaction);
}
```

## Migration Strategy

### Phase 1: Add `call_sessions` Table
- Create table and indexes
- Deploy to production (non-breaking change)
- Table exists but not yet used

### Phase 2: Update Claude SDK
- Add new MCP tools (`create_briefed_call`, `update_call_outcome`)
- Update `processCallCompletion` to use call_sessions
- Test with new calls (old system still works via scheduled_calls)

### Phase 3: Update Scheduler
- Modify `processOrchestratorScheduledCalls` to query both tables
- Priority: `call_sessions` first, then `scheduled_calls` (backward compat)
- Pass `sessionId` in webhook URLs

### Phase 4: Update Voice Service
- Modify endpoints to accept and load sessionId
- Inject briefing into system prompts
- Link interactions to call_sessions on cleanup

### Phase 5: Data Migration
- Migrate existing `scheduled_calls` to `call_sessions` format
- Backfill what we can (no briefings for old calls, but preserve scheduling data)

### Phase 6: Deprecate `scheduled_calls`
- Stop querying old table
- Keep table for historical reference
- Remove from active code paths

## User Experience

### Before This Design

**User calls Luna:**
- Call happens, transcript saved
- Claude SDK analyzes but has no record it was user-initiated
- No unified view of conversation history

**Luna calls user (SDK-scheduled):**
- Agent knows call type but not WHY it's calling
- Generic prompts without strategic context
- No tracking of whether intervention worked

### After This Design

**User calls Luna:**
- Call tracked in `call_sessions` with direction='inbound'
- SDK analyzes and generates summary + assessment
- Can schedule intelligent follow-ups based on conversation
- Full history visible

**Luna calls user (SDK-scheduled):**
- Agent receives rich briefing: "You're calling because user skipped gym 3 days. Pattern: stress → avoidance. Goal: get specific commitment for today."
- Conversation is personalized and focused
- Outcome tracked: Did it work? User satisfaction?
- SDK learns from effectiveness metrics

**Both perspectives:**
- Unified call history showing all interactions
- Each entry has: direction, summary, outcome, effectiveness
- User can see "why Luna called me" with full transparency
- System can learn what interventions work and adapt

## Observability & Debugging

### Queries for Monitoring

**Recent calls for a user:**
```sql
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

**SDK intervention effectiveness:**
```sql
SELECT
  call_type,
  outcome_assessment->>'effectiveness' as effectiveness,
  COUNT(*) as count
FROM call_sessions
WHERE
  direction = 'outbound'
  AND scheduled_by = 'claude-sdk'
  AND outcome_assessment IS NOT NULL
GROUP BY call_type, effectiveness
ORDER BY call_type, count DESC;
```

**Follow-up success rate:**
```sql
SELECT
  call_type,
  AVG(CASE WHEN outcome_assessment->>'goal_achieved' = 'true' THEN 1 ELSE 0 END) as success_rate
FROM call_sessions
WHERE outcome_assessment IS NOT NULL
GROUP BY call_type;
```

### Logging Strategy

**Key events to log:**
1. Session created with briefing (log trigger_reason for visibility)
2. Briefing loaded by voice agent (confirm context passed correctly)
3. Interaction linked to session (confirm relationship established)
4. Outcome assessment updated (track SDK analysis completion)
5. Follow-up scheduled based on outcome (close the learning loop)

## Success Criteria

**Technical:**
- All calls (both directions) tracked in `call_sessions`
- Briefing successfully injected into voice agent system prompts
- Interaction ↔ session linkage 100% accurate
- Zero data loss during migration from `scheduled_calls`

**User Experience:**
- Voice agent demonstrates awareness of WHY it's calling (mentioned in first 10 seconds)
- Conversations feel personalized based on detected patterns
- Call history shows meaningful summaries, not just transcripts
- User can see "Luna's reasoning" for scheduled calls

**Learning Quality:**
- Outcome assessments populated for 95%+ of calls
- SDK can query effectiveness metrics to inform future decisions
- Follow-up calls scheduled show improvement in intervention strategy over time

## Future Enhancements

**Short-term (not in initial scope):**
- User-facing dashboard to view call history and SDK reasoning
- SMS notifications: "Luna wants to call you about [trigger_reason]. Good time?"
- User feedback: thumbs up/down after calls to train effectiveness model

**Long-term:**
- Multi-call intervention campaigns (sequence of calls toward a goal)
- A/B testing framework for intervention strategies
- Predictive effectiveness scoring before scheduling calls
- Voice tone analysis correlated with outcome success

---

**Design Status:** ✅ Ready for Implementation
**Next Action:** Set up git worktree and create implementation plan
