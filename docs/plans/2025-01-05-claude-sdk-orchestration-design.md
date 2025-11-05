# Claude Agent SDK Orchestration Layer Design

**Date:** January 5, 2025
**Status:** Design Phase
**Author:** Claude (via brainstorming session)

## Executive Summary

This design introduces an intelligent orchestration layer using the Claude Agent SDK to transform Luna from a reactive voice assistant into a proactive, learning system. The SDK acts as a "strategic brain" that analyzes call transcripts, learns behavioral patterns, and autonomously schedules personalized interventions - while OpenAI Realtime API continues to handle real-time voice interactions.

**Key Benefits:**
- Continuous learning across all user interactions
- Proactive intervention scheduling based on detected patterns
- Deep reasoning capabilities between calls (not limited by real-time constraints)
- Long-term context maintenance (weeks/months of user history)
- Autonomous decision-making with human oversight options

## Architecture Overview

### Two-Layer Architecture

**Layer 1: Voice Interface (OpenAI Realtime API)**
- Purpose: Handle live phone calls with low latency
- Technology: OpenAI Realtime API + Twilio Media Streams
- Capabilities: Voice interaction, basic function calling, immediate user data queries
- Output: Call transcripts + metadata saved to Supabase `interactions` table

**Layer 2: Orchestration Brain (Claude Agent SDK)**
- Purpose: Strategic analysis, learning, and planning between calls
- Technology: Claude Agent SDK with custom MCP tools
- Capabilities: Pattern detection, long-term memory, complex reasoning, autonomous scheduling
- Triggers: Call completions, scheduled analysis, behavior anomalies, manual requests

### Communication Flow

```
Phone Call → OpenAI Realtime → Transcript to Database
                                       ↓
                                Supabase Realtime trigger
                                       ↓
                               Claude SDK Agent wakes
                                       ↓
                    Analyzes + Learns + Plans + Schedules
                                       ↓
                    Updates DB (scheduled_calls, insights)
                                       ↓
                        Cron picks up → Next call triggered
```

**Critical Principle:** SDK never touches voice directly - it operates in the "thinking layer" between calls.

## Component Design

### Custom MCP Tools

Create two in-process MCP servers that give Claude domain-specific capabilities:

#### 1. `chore-tracker-tools` MCP Server

Tools for managing user lifecycle and scheduling:

- **`get_user_profile`**
  - Input: `userId: string`
  - Output: User data, preferences, historical insights
  - Purpose: Load user context for analysis

- **`query_tasks`**
  - Input: `userId: string, filters: {status?, priority?, dateRange?}`
  - Output: Filtered task list with completion data
  - Purpose: Understand current task landscape

- **`create_scheduled_call`**
  - Input: `userId: string, callType: enum, scheduledFor: timestamp, customInstructions?: string`
  - Output: Scheduled call record
  - Purpose: Autonomously schedule interventions

- **`update_user_insights`**
  - Input: `userId: string, insights: object`
  - Output: Updated user profile
  - Purpose: Write learned patterns to persistent storage

- **`get_schedule`**
  - Input: `userId: string, dateRange: {start, end}`
  - Output: Calendar events and routines
  - Purpose: Context-aware scheduling (avoid conflicts)

- **`analyze_behavior_patterns`**
  - Input: `userId: string, query: {type, timeframe}`
  - Output: Aggregated behavior data
  - Purpose: Detect trends and anomalies

#### 2. `interaction-analyzer-tools` MCP Server

Tools for call analysis and accountability:

- **`get_recent_calls`**
  - Input: `userId: string, filters: {callType?, since?, limit?}`
  - Output: Call transcripts with metadata
  - Purpose: Access conversation history

- **`extract_commitments`**
  - Input: `transcript: string`
  - Output: Parsed promises, goals, action items
  - Purpose: Track user commitments

- **`track_accountability`**
  - Input: `userId: string, commitmentId: string`
  - Output: Commitment status (kept/broken) with evidence
  - Purpose: Compare promises vs actual behavior

- **`sentiment_analysis`**
  - Input: `transcript: string` or `userId: string, timeRange`
  - Output: Emotional state classification + trends
  - Purpose: Understand user's mental/emotional patterns

### Session Management

**User Session Persistence:**
- Each user maintains a long-running Claude SDK session
- Session stored in Supabase: `user_sessions` table
- Session accumulates: call summaries, learned preferences, ongoing plans, behavioral models
- Sessions resume on each trigger - Claude remembers context across days/weeks
- Session forking available for "what-if" scenario planning

**Session Lifecycle:**
```
User created → Initialize session
               ↓
Each interaction → Resume session → Analyze → Update session
                   ↓
                Session stores accumulated knowledge
                   ↓
Next interaction → Resume with full context
```

### Streaming Input Mode

Use async generators to dynamically construct prompts with fresh data:

```javascript
async function* contextGenerator(interaction, userId) {
  // Fetch latest context
  const recentBehavior = await getBehaviorSummary(userId);
  const currentGoals = await getUserGoals(userId);

  yield {
    type: 'user',
    message: {
      role: 'user',
      content: `
        New ${interaction.callType} call completed.

        Transcript: "${interaction.transcript}"

        Recent behavior context: ${recentBehavior}
        Current goals: ${currentGoals}

        Analyze this interaction and determine next actions.
      `
    }
  };
}
```

### Specialized Subagents

Define programmatic subagents for focused analysis:

- **`behavior-analyst`**
  - Description: "Use PROACTIVELY for pattern detection and behavioral analysis"
  - Tools: Read-only access to interactions and tasks
  - Model: Sonnet (balanced performance)
  - Purpose: Identify trends, regressions, improvements

- **`call-scheduler`**
  - Description: "Use when determining optimal intervention timing"
  - Tools: Schedule tools, calendar access
  - Model: Haiku (fast, cost-effective)
  - Purpose: Timing optimization, conflict avoidance

- **`content-generator`**
  - Description: "Use for creating personalized call scripts and instructions"
  - Tools: User profile, interaction history
  - Model: Sonnet
  - Purpose: Generate dynamic, personalized call content

## Event Processing Pipeline

### Trigger Events

The SDK agent wakes up on four types of events:

1. **Call Completion** (Primary trigger)
   - Event: New record in `interactions` table
   - Subscription: Supabase Realtime `postgres_changes`
   - Frequency: After every call (~5-10 per day per user)

2. **Scheduled Planning Sessions** (Strategic trigger)
   - Event: Cron job (daily 11pm, weekly Sunday)
   - Purpose: Deep analysis of accumulated data
   - Frequency: Daily/weekly

3. **Behavior Anomalies** (Reactive trigger)
   - Event: Database trigger detects pattern (e.g., 3 consecutive missed tasks)
   - Purpose: Immediate intervention when needed
   - Frequency: As needed (ideally rare)

4. **Manual Triggers** (On-demand)
   - Event: API endpoint invocation
   - Purpose: Testing, debugging, user-requested analysis
   - Frequency: Ad-hoc

### Processing Pipeline

Each trigger executes this flow:

```
1. Event Received
   ↓
2. Load User Session
   - Fetch session_id from user_sessions table
   - Resume Claude session with full context
   ↓
3. Inject Fresh Context
   - Use MCP tools to query latest data
   - Build dynamic prompt via streaming input
   ↓
4. Claude Analysis
   - Analyzes transcript/event
   - Uses tools to explore patterns
   - Makes connections across timeframes
   ↓
5. Decision & Actions
   - Schedule calls (if warranted)
   - Update user insights
   - Create tasks or reminders
   - Flag issues for human review
   ↓
6. Save Session State
   - Update context_summary in user_sessions
   - Persist for next trigger
   ↓
7. Return Summary
   - Log actions taken
   - Emit metrics for monitoring
```

### Concrete Example Flow

**Scenario:** User completes wind-down reflection call at 10pm

```
10:00pm: Call ends → Transcript saved to interactions table
10:01pm: SDK agent triggered via Supabase Realtime
10:01pm: Agent loads user session (30 days of context)
10:01pm: Agent analyzes transcript with tools:
         - get_recent_calls(userId, since: "7 days ago")
         - query_tasks(userId, filters: {status: "incomplete"})
         - analyze_behavior_patterns(userId, type: "exercise")

Agent observes:
- User mentioned "feeling stressed about work" (5th time this week)
- No gym sessions logged in 4 days
- Sleep quality declining (from previous reflections)
- Pattern detected: Stress → skip gym → poor sleep

Agent makes connections:
- User's stress coping mechanism breakdown detected
- Exercise is key stress reliever for this user
- Morning intervention most effective based on history

10:02pm: Agent takes actions:
         - create_scheduled_call(
             userId,
             callType: "motivational-wakeup",
             scheduledFor: "7:00am tomorrow",
             customInstructions: "Focus on gym commitment + stress relief benefits"
           )
         - update_user_insights(
             userId,
             insights: {
               patterns: ["Stress → exercise avoidance cycle detected"],
               interventions: ["Morning calls effective for exercise motivation"]
             }
           )

10:02pm: Session saved with updated context
10:03pm: Summary logged: "Scheduled morning intervention due to stress-exercise pattern"

7:00am: Cron job picks up scheduled_calls → Initiates motivational call
```

## Technical Implementation

### Service Architecture

**New Service: `server/claude-orchestrator/`**

```
server/claude-orchestrator/
├── index.js              # Main service entry point
├── mcp-servers/
│   ├── choreTracker.js   # Chore tracker MCP tools
│   └── interactionAnalyzer.js  # Analysis MCP tools
├── processors/
│   ├── callCompletion.js
│   ├── scheduledAnalysis.js
│   └── behaviorAnomaly.js
├── session-manager.js    # Session persistence logic
└── prompts/
    ├── strategic-planner.js
    └── mode-specific/
        ├── reflection.js
        ├── scolding.js
        └── motivational.js
```

### Core Implementation Pattern

```javascript
// server/claude-orchestrator/index.js
const { query, createSdkMcpServer, tool } = require('@anthropic-ai/claude-agent-sdk');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Define MCP servers
const choreTrackerServer = createSdkMcpServer({
  name: 'chore-tracker',
  version: '1.0.0',
  tools: [
    tool(
      'schedule_call',
      'Schedule a future call for user intervention',
      {
        userId: z.string().uuid(),
        callType: z.enum(['scolding', 'motivational-wakeup', 'task-reminder', 'morning-briefing']),
        scheduledFor: z.string().datetime(),
        customInstructions: z.string().optional()
      },
      async (args) => {
        const { data, error } = await supabase
          .from('scheduled_calls')
          .insert({
            user_id: args.userId,
            call_type: args.callType,
            scheduled_for: args.scheduledFor,
            custom_instructions: args.customInstructions,
            created_by: 'sdk-agent'
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: `Call scheduled: ${args.callType} for ${args.scheduledFor}`
          }]
        };
      }
    ),

    tool(
      'update_user_insights',
      'Update learned patterns and insights about user',
      {
        userId: z.string().uuid(),
        insights: z.object({
          patterns: z.array(z.string()).optional(),
          preferences: z.array(z.string()).optional(),
          goals: z.array(z.string()).optional(),
          behaviors: z.record(z.any()).optional()
        })
      },
      async (args) => {
        // Fetch current insights
        const { data: user } = await supabase
          .from('users')
          .select('insights')
          .eq('id', args.userId)
          .single();

        // Merge new insights
        const updatedInsights = {
          ...user.insights,
          ...args.insights,
          lastUpdated: new Date().toISOString()
        };

        await supabase
          .from('users')
          .update({ insights: updatedInsights })
          .eq('id', args.userId);

        return {
          content: [{
            type: 'text',
            text: 'User insights updated successfully'
          }]
        };
      }
    )

    // ... more tools
  ]
});

// Subscribe to call completions
supabase
  .channel('interactions')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'interactions' },
    async (payload) => {
      await processCallCompletion(payload.new);
    }
  )
  .subscribe();

async function processCallCompletion(interaction) {
  const { user_id, transcript, call_type } = interaction;

  // Load or create session
  const sessionId = await getOrCreateUserSession(user_id);

  // Build streaming prompt with fresh context
  async function* contextGenerator() {
    const recentCalls = await getRecentCalls(user_id, 7);
    const taskSummary = await getTaskSummary(user_id);

    yield {
      type: 'user',
      message: {
        role: 'user',
        content: `
You are Luna's strategic planning system. A new ${call_type} call just completed.

CALL TRANSCRIPT:
"${transcript}"

RECENT CONTEXT (last 7 days):
${recentCalls}

CURRENT TASKS:
${taskSummary}

INSTRUCTIONS:
1. Analyze this interaction for patterns, commitments, and emotional state
2. Compare against recent behavior to detect trends
3. Determine if any proactive interventions are warranted
4. Schedule calls, update insights, or flag issues as needed
5. Summarize your analysis and actions taken

Use your tools to query additional data and take actions.
        `
      }
    };
  }

  // Run Claude SDK agent
  console.log(`Processing call completion for user ${user_id}`);

  for await (const message of query({
    prompt: contextGenerator(),
    options: {
      resume: sessionId,
      mcpServers: {
        'chore-tracker': choreTrackerServer,
        // 'interaction-analyzer': interactionAnalyzerServer
      },
      allowedTools: [
        'mcp__chore-tracker__schedule_call',
        'mcp__chore-tracker__update_user_insights',
        'mcp__chore-tracker__query_tasks',
        'mcp__chore-tracker__analyze_behavior_patterns'
      ],
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: `
You are Luna's strategic intelligence layer. You don't handle voice calls directly -
you analyze them afterward to learn, plan, and improve future interactions.

Your goals:
- Build deep understanding of each user over time
- Detect patterns that indicate needed interventions
- Schedule proactive calls before issues escalate
- Continuously refine your model of user behavior
- Be autonomous but thoughtful in your decisions
        `
      },
      maxTurns: 10,
      model: 'claude-sonnet-4-5'
    }
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      console.log('SDK Agent completed analysis:', message.result);
    } else if (message.type === 'error') {
      console.error('SDK Agent error:', message.error);
    }
  }

  // Update session last_active
  await updateSessionTimestamp(user_id, sessionId);
}
```

### Error Handling & Resilience

**Failure Isolation:**
- SDK agent failures do NOT affect voice call functionality
- Voice layer (OpenAI Realtime) operates independently
- If SDK is down, calls still work - just no post-call analysis

**Retry Strategy:**
- Transient errors: Exponential backoff (1s, 2s, 4s, 8s)
- Max retries: 3 attempts
- Failed events: Move to dead letter queue for manual review

**Timeout Protection:**
- Max processing time: 2 minutes per trigger
- Prevents runaway SDK sessions
- Timeout errors logged for investigation

**Rate Limiting:**
- Max 1 concurrent SDK session per user
- Queue additional triggers if session already running
- Prevents resource exhaustion

**Monitoring:**
```javascript
// Log all SDK actions with metrics
await logSDKAction({
  userId,
  trigger: 'call_completion',
  duration: Date.now() - startTime,
  actions: ['scheduled_call', 'updated_insights'],
  success: true
});
```

### Resource Management

**Deployment Options:**

Option A: **Serverless Functions** (Recommended for MVP)
- Railway background workers or AWS Lambda
- Triggered by Supabase webhooks
- Auto-scaling based on load
- Cold start acceptable (analysis not time-critical)

Option B: **Long-Running Service**
- Single Node.js process with event queue
- Always-on subscription to Supabase Realtime
- Lower latency, more predictable
- Requires process management (PM2, Docker)

**Resource Limits:**
- Max concurrent sessions: Based on infrastructure (start with 10)
- Queue depth: 100 pending events
- Session timeout: 2 minutes
- Cost monitoring: Track Claude API usage per user

## Data Models

### New Tables

```sql
-- SDK session tracking
CREATE TABLE user_sessions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  last_active TIMESTAMP DEFAULT NOW(),
  context_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active);

-- Scheduled calls managed by SDK
CREATE TABLE scheduled_calls (
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
CREATE TABLE sdk_actions (
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
```

### Modified Tables

```sql
-- Add insights column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '{
  "patterns": [],
  "preferences": [],
  "goals": [],
  "behaviors": {},
  "lastUpdated": null
}'::jsonb;

-- Add sentiment and commitments to interactions
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS sentiment TEXT,
  ADD COLUMN IF NOT EXISTS extracted_commitments JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_interactions_sentiment ON interactions(sentiment) WHERE sentiment IS NOT NULL;
```

### Data Flow Example

User perspective over one week:

```
Monday 8am: Call completed
            → interactions.insert(transcript: "I'll go to gym today")
            → SDK triggered
            → sdk_actions.insert(actions: ["extracted commitment: gym"])
            → users.insights updated: {goals: ["daily gym"]}

Monday 8pm: SDK scheduled analysis job runs
            → No gym task completed
            → scheduled_calls.insert(call_type: "scolding:gym", scheduled_for: "Tue 7am")

Tuesday 7am: Cron picks up scheduled call
             → Twilio initiates scolding call
             → scheduled_calls.update(status: "completed")

Tuesday 7:30am: Call completed
                → SDK analyzes: User committed to afternoon gym
                → Creates task: "Gym session - 5pm"

Tuesday 5pm: Task marked complete
             → SDK triggered by behavior change
             → users.insights updated: {patterns: ["Responds to accountability"]}
```

## User Experience

### Before SDK (Current State)

- Calls follow hardcoded schedule or manual triggers
- Each call is isolated - no learning between interactions
- Luna uses generic prompts with basic personalization
- Developer manually adjusts call timing and content based on observations

### After SDK (Future State)

- Luna learns from every interaction and continuously adapts
- Calls become increasingly personalized over weeks/months
- Proactive interventions scheduled based on detected patterns
- System self-optimizes timing, tone, and approach per user

### Example User Journey

**Week 1:**
- Marco gets standard motivational morning calls
- SDK observes: Marco responsive to accountability framing
- Insight stored: "Accountability tone effective"

**Week 2:**
- Marco skips gym 3 times
- SDK detects pattern, schedules immediate scolding call
- Call happens, Marco commits to change
- SDK learns: "Immediate intervention > delayed"

**Week 3:**
- Marco mentions work stress in reflection call
- SDK correlates: Stress → exercise avoidance → sleep issues
- SDK schedules morning breathing exercise reminder
- Proactively schedules lighter workout suggestions

**Week 4:**
- Marco consistently hitting goals
- SDK adjusts: Reduces scolding calls, increases positive reinforcement
- Learns: "Positive momentum phase - support, don't push too hard"

**Month 2:**
- SDK has rich behavioral model
- Predicts stress patterns before they manifest
- Schedules preventive interventions
- Marco experiences Luna as "actually understanding my life"

### User Controls & Transparency

**Configuration Options:**
- Autonomy level: "Fully autonomous" vs "Review scheduled calls" vs "Manual only"
- Intervention frequency: "Aggressive" vs "Balanced" vs "Minimal"
- Call type preferences: Enable/disable specific call types
- Quiet hours: Block SDK from scheduling during certain times

**Transparency Features:**
- Dashboard shows SDK's reasoning: "Why did Luna call me?"
- View learned insights: "What does Luna know about me?"
- Call history with SDK annotations
- Weekly summary email: "This week, Luna learned..."

**Override Capabilities:**
- Cancel any scheduled call
- Edit SDK-generated instructions before call
- Provide feedback: "This call was helpful/unhelpful"
- SDK learns from feedback signals

## Monitoring & Observability

### Key Metrics

**System Health:**
- SDK uptime and availability
- Average processing time per trigger
- Error rate and failure modes
- Queue depth and backlog

**User Engagement:**
- Calls scheduled vs completed
- User satisfaction (post-call ratings)
- Intervention effectiveness (did behavior change?)
- Pattern detection accuracy

**Learning Quality:**
- Number of insights per user over time
- Accuracy of scheduled interventions
- User override rate (low = SDK making good decisions)
- Long-term trend improvement

### Logging Strategy

```javascript
// Log structure for each SDK action
{
  userId: "uuid",
  trigger: "call_completion",
  timestamp: "2025-01-05T10:01:00Z",
  duration: 1243, // ms
  actions: [
    { type: "schedule_call", callType: "motivational-wakeup", scheduledFor: "..." },
    { type: "update_insights", keys: ["patterns", "preferences"] }
  ],
  toolsUsed: ["query_tasks", "analyze_behavior_patterns"],
  reasoning: "Detected stress-exercise pattern requiring intervention",
  success: true
}
```

### Alerting

**Critical Alerts:**
- SDK service down for > 5 minutes
- Error rate > 10% over 1 hour
- Queue backlog > 100 events

**Warning Alerts:**
- Processing time > 60 seconds (indicates complexity issues)
- User override rate > 50% (SDK making poor decisions)
- Zero patterns detected for user after 2 weeks (learning failure)

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Set up claude-orchestrator service structure
- Create basic MCP tools (schedule_call, update_user_insights)
- Implement Supabase Realtime subscription
- Basic call completion processing pipeline
- Manual testing with one user

### Phase 2: Analysis Tools (Week 3)
- Build interaction-analyzer MCP server
- Implement pattern detection tools
- Add sentiment analysis capability
- Session management and persistence
- Dashboard for viewing SDK actions

### Phase 3: Proactive Scheduling (Week 4)
- Implement autonomous call scheduling logic
- Add behavior anomaly detection
- Build scheduled analysis jobs (daily/weekly)
- User override and control features
- Production testing with 2-3 users

### Phase 4: Learning & Optimization (Week 5-6)
- Refine prompts based on real usage
- Add specialized subagents
- Implement feedback loops
- Performance optimization
- Full rollout to all users

### Phase 5: Advanced Features (Week 7+)
- Multi-user pattern detection
- Predictive intervention modeling
- A/B testing framework
- Advanced personalization
- Mobile app integration

## Success Criteria

**Technical:**
- SDK processes 95% of call completions within 5 seconds
- Error rate < 1%
- Zero impact on voice call reliability

**User Experience:**
- Users report Luna "feels more personal" (qualitative feedback)
- Scheduled interventions have > 60% completion rate
- User override rate < 20% (SDK making good decisions)

**Learning Quality:**
- Each user accumulates 10+ meaningful insights after 1 month
- Pattern detection identifies 2+ actionable patterns per user
- Long-term behavior trends show improvement

## Risks & Mitigations

### Risk 1: SDK Over-Scheduling
**Risk:** SDK schedules too many calls, overwhelming user
**Mitigation:**
- Rate limits: Max 1 call per day unless urgent
- User can set max call frequency
- SDK learns from cancellation patterns

### Risk 2: Privacy Concerns
**Risk:** Users uncomfortable with "AI learning about them"
**Mitigation:**
- Full transparency dashboard
- Data deletion on request
- Clear explanation of how data is used
- User can disable learning features

### Risk 3: Poor Intervention Timing
**Risk:** SDK schedules calls at inconvenient times
**Mitigation:**
- Integrate with user calendar
- Learn preferred call times
- Quiet hours configuration
- User can reschedule any call

### Risk 4: SDK Service Downtime
**Risk:** SDK unavailable, preventing post-call analysis
**Mitigation:**
- Voice calls still work (isolated layers)
- Event queue persists failed jobs
- Automated retries with backoff
- Dead letter queue for manual review

### Risk 5: Cost Overruns
**Risk:** Claude API usage becomes expensive
**Mitigation:**
- Use Haiku for simple analysis tasks
- Set per-user spending limits
- Monitor and alert on cost spikes
- Optimize prompts for efficiency

## Open Questions

1. **Session pruning:** When should we fork/restart a user session to avoid context bloat?
2. **Multi-user patterns:** Should SDK detect patterns across all users for shared insights?
3. **Intervention escalation:** How should SDK escalate if interventions aren't working?
4. **Human-in-loop:** What decisions require human approval vs full autonomy?
5. **Model selection:** Sonnet vs Haiku vs Opus for different analysis types?

## Next Steps

1. Review and validate this design with stakeholders
2. Set up development worktree for implementation
3. Create detailed implementation plan with specific tasks
4. Begin Phase 1 implementation

---

**Design Status:** ✅ Ready for Review
**Next Action:** Create implementation plan or begin prototyping
