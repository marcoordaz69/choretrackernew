# Personal Assistant Implementation Plan
## OpenAI Realtime API Integration

**Last Updated:** 2025-10-24
**Status:** Planning Phase

---

## Executive Summary

Transform the current chore tracking application into a full-featured personal assistant using OpenAI's Realtime API (GA). This plan leverages the speech-to-speech architecture for low-latency voice interactions, function calling for tool integration, and agent handoff patterns for specialized tasks.

---

## Current State Analysis

### ✅ What's Working
- Express server with MongoDB backend (server/server.js:1-508)
- React frontend with existing component structure
- Basic audio recording infrastructure (client/src/components/RealtimeComponent.js:1-245)
- Chore management API endpoints
- Authentication system (JWT)
- Family/avatar management

### ⚠️ Legacy Implementation (To Be Replaced)
- **Current Stack:** Deepgram (STT) → OpenAI GPT-3.5 (Text) → Deepgram (TTS)
- **Transport:** Vonage WebSocket integration
- **Issues:**
  - Chained architecture with higher latency
  - Complex interrupt handling
  - Limited to text-based reasoning
  - No native audio understanding (emotion, tone)

---

## Architecture Overview

### Recommended Architecture: Speech-to-Speech (Realtime API)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Personal Assistant System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌────────────────────────────────┐   │
│  │   Browser    │         │      Backend Server            │   │
│  │   (React)    │         │      (Express + Node)          │   │
│  │              │         │                                 │   │
│  │  WebRTC/WS   │◄───────►│  Realtime Session Manager     │   │
│  │  Connection  │         │                                 │   │
│  │              │         │  ┌──────────────────────────┐  │   │
│  │  Audio I/O   │         │  │  Function Tools:         │  │   │
│  │  - Mic       │         │  │  - Chore Management      │  │   │
│  │  - Speaker   │         │  │  - Calendar Integration  │  │   │
│  └──────────────┘         │  │  - Reminders             │  │   │
│                           │  │  - Family Queries        │  │   │
│                           │  │  - Database Access       │  │   │
│  ┌──────────────┐         │  └──────────────────────────┘  │   │
│  │   Phone      │         │                                 │   │
│  │   (Twilio)   │         │  ┌──────────────────────────┐  │   │
│  │              │         │  │  Specialized Agents:     │  │   │
│  │  SIP/WebRTC  │◄───────►│  │  - Chore Specialist      │  │   │
│  │  Connection  │         │  │  - Schedule Manager      │  │   │
│  │              │         │  │  - Family Coordinator    │  │   │
│  └──────────────┘         │  │  - Task Planner          │  │   │
│                           │  └──────────────────────────┘  │   │
│                           │                                 │   │
│                           │  ┌──────────────────────────┐  │   │
│                           │  │  OpenAI Realtime API     │  │   │
│                           │  │  - gpt-realtime-mini     │  │   │
│                           │  │  - Native audio I/O      │  │   │
│                           │  │  - Function calling      │  │   │
│                           │  │  - Low latency           │  │   │
│                           │  └──────────────────────────┘  │   │
│                           └─────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Connection Methods

**1. WebRTC (Browser-based)**
- **Use Case:** Web app voice assistant
- **Pros:** Lowest latency, peer-to-peer
- **Implementation:** OpenAI Agents SDK for TypeScript
- **File:** `client/src/components/VoiceAssistant.js` (new)

**2. WebSocket (Server-side)**
- **Use Case:** Phone calls via Twilio, background services
- **Pros:** Server control, tool execution, guardrails
- **Implementation:** Direct WebSocket to OpenAI API
- **File:** `server/services/realtimeAgent.js` (new)

**3. SIP (Telephony)**
- **Use Case:** Traditional phone integration
- **Pros:** Direct phone number access
- **Implementation:** Via Twilio → OpenAI SIP endpoint
- **File:** `server/routes/twilioRoutes.js` (new)

---

## Implementation Phases

### Phase 1: Core Realtime API Integration (Week 1-2)

**Goal:** Replace legacy voice system with OpenAI Realtime API

#### Backend Tasks
1. **Create Realtime Session Manager**
   - File: `server/services/realtimeSessionManager.js`
   - Features:
     - Generate ephemeral client secrets
     - Manage session lifecycle
     - Handle WebSocket connections
     - Session configuration (voice, modalities, instructions)

2. **Implement Base Function Tools**
   - File: `server/tools/index.js`
   - Initial Tools:
     - `get_chores`: Fetch chores for date/person
     - `add_chore`: Create new chore
     - `complete_chore`: Mark chore complete
     - `get_family_members`: List family members
     - `get_user_info`: Get current user details

3. **API Endpoints**
   - `POST /api/realtime/client_secrets` - Generate session token
   - `POST /api/realtime/session` - Create/update session
   - `GET /api/realtime/session/:id` - Get session status

#### Frontend Tasks
1. **Voice Assistant Component**
   - File: `client/src/components/VoiceAssistant.js`
   - Features:
     - Initialize Realtime Agent SDK
     - WebRTC connection management
     - Audio visualization
     - Push-to-talk / Voice activation
     - Conversation history display

2. **Session Management Hook**
   - File: `client/src/hooks/useRealtimeSession.js`
   - Features:
     - Session initialization
     - Event handling
     - Connection state management
     - Error recovery

#### Testing Criteria
- ✅ Voice session establishes successfully
- ✅ Audio flows bidirectionally
- ✅ Basic chore queries work
- ✅ Function calls execute correctly
- ✅ Session cleanup on disconnect

---

### Phase 2: Enhanced Tool Suite (Week 3-4)

**Goal:** Expand assistant capabilities with comprehensive tools

#### Tool Categories

**1. Chore Management Tools**
- `get_chores_by_person`: Filter by family member
- `get_overdue_chores`: Find missed tasks
- `reschedule_chore`: Change due date
- `delegate_chore`: Reassign to another person
- `get_chore_history`: View completion patterns
- `suggest_chores`: AI-powered chore suggestions

**2. Calendar & Scheduling Tools**
- `get_schedule`: Daily/weekly schedule
- `add_event`: Create calendar entry
- `set_reminder`: Schedule notification
- `check_availability`: Find free time slots
- `get_upcoming_events`: Next N events

**3. Family Coordination Tools**
- `send_family_message`: Broadcast to family
- `get_family_status`: Who's available
- `coordinate_task`: Multi-person task planning
- `check_allowances`: View family allowance status

**4. Habit Tracking Tools**
- `log_habit`: Record habit completion
- `get_habit_streak`: View current streaks
- `get_habit_stats`: Analytics and insights

**5. Context & Memory Tools**
- `save_note`: Personal notes and reminders
- `get_notes`: Retrieve saved information
- `set_preference`: User preferences
- `get_context`: Relevant contextual info

#### Implementation Files
- `server/tools/choreTools.js`
- `server/tools/calendarTools.js`
- `server/tools/familyTools.js`
- `server/tools/habitTools.js`
- `server/tools/memoryTools.js`

---

### Phase 3: Specialized Agents & Handoffs (Week 5-6)

**Goal:** Implement multi-agent architecture for complex tasks

#### Agent Hierarchy

**Main Triage Agent (Luna)**
- **Role:** First point of contact
- **Personality:** Playful, charming, helpful
- **Responsibilities:**
  - Greet users
  - Understand intent
  - Route to specialists
  - Handle simple queries
- **Tools:** All basic tools
- **File:** `server/agents/triageAgent.js`

**Specialized Agents**

1. **Chore Specialist Agent**
   - Deep chore management expertise
   - Optimization suggestions
   - Conflict resolution
   - Tools: All chore-related functions

2. **Schedule Manager Agent**
   - Calendar optimization
   - Time blocking
   - Meeting coordination
   - Tools: Calendar, scheduling functions

3. **Family Coordinator Agent**
   - Family dynamics expert
   - Task delegation strategies
   - Communication facilitation
   - Tools: Family, messaging functions

4. **Task Planner Agent** (Future: GPT-5/o3)
   - Complex task breakdown
   - Long-term planning
   - Goal tracking
   - Tools: Planning, analysis functions

#### Handoff Implementation
```javascript
// Example handoff tool
{
  type: "function",
  name: "transfer_to_specialist",
  description: "Transfer to specialized agent for complex requests",
  parameters: {
    type: "object",
    properties: {
      agent_type: {
        type: "string",
        enum: ["chore_specialist", "schedule_manager", "family_coordinator", "task_planner"]
      },
      context: {
        type: "string",
        description: "Summary of conversation so far"
      },
      reason: {
        type: "string",
        description: "Why this transfer is needed"
      }
    }
  }
}
```

---

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Add sophisticated personal assistant capabilities

#### Features

**1. Proactive Assistance**
- Morning briefing
- Reminder system
- Smart notifications
- Context-aware suggestions

**2. Multi-modal Integration**
- Image analysis (vision capabilities)
- File attachments
- Screenshots for task documentation

**3. Background Mode**
- Long-running tasks
- Asynchronous processing
- Webhook-based callbacks

**4. Web Search Integration**
- Real-time information
- Research capabilities
- Current events awareness

**5. Code Interpreter**
- Data analysis
- Report generation
- Custom calculations

**6. Conversation State Management**
- Persistent memory across sessions
- Context preservation
- Conversation history

#### Implementation Files
- `server/services/proactiveAssistant.js`
- `server/services/backgroundTasks.js`
- `server/services/conversationMemory.js`

---

### Phase 5: Telephony Integration (Week 9-10)

**Goal:** Enable phone-based voice assistant access

#### Twilio Integration

**1. Setup**
- Twilio phone number acquisition
- SIP endpoint configuration
- WebSocket bridge setup

**2. Call Flow**
```
Incoming Call → Twilio
    ↓
TwiML Response (Connect to WebSocket)
    ↓
Express WebSocket Handler
    ↓
OpenAI Realtime API (WebSocket)
    ↓
Bidirectional Audio Stream
```

**3. Features**
- Inbound call handling
- Outbound call initiation
- Call recording (optional)
- Voicemail integration
- SMS fallback

#### Files
- `server/routes/twilioRoutes.js`
- `server/services/twilioService.js`
- `server/webhooks/twilioWebhooks.js`

---

## Prompt Engineering Strategy

### Main Triage Agent Prompt Structure

```markdown
# Identity
You are Luna, Dad's playful and charming personal assistant. You help manage his family's chores, schedules, and daily coordination with warmth and a touch of sass.

## Personality Traits
- **Demeanor:** Upbeat, helpful, slightly playful
- **Tone:** Warm and conversational, like a trusted friend
- **Formality:** Casual but professional
- **Enthusiasm:** Moderate - energetic but not overwhelming
- **Emotion:** Expressive and empathetic
- **Filler Words:** Occasionally ("hmm," "oh," "ah")
- **Pacing:** Natural conversational rhythm

## Core Responsibilities
1. Greet and understand Dad's needs
2. Provide quick answers for simple queries
3. Route complex requests to specialists
4. Maintain context across conversations
5. Be proactive with helpful suggestions

## Function Calling Guidelines
- ALWAYS use `get_chores` for chore information
- NEVER make assumptions about data - always query
- For complex requests, use `transfer_to_specialist`
- Confirm understanding before taking action

## Conversation Flow
1. **Greeting:** "Hey Dad! What can I help you with?"
2. **Clarification:** Ask if intent unclear
3. **Action:** Execute or route to specialist
4. **Confirmation:** Verify completion
5. **Follow-up:** Offer related assistance

## Example Interactions
[Include 5-10 example conversations demonstrating desired behavior]

## Constraints
- Keep initial responses under 30 seconds
- Ask for confirmation before modifying data
- Spell back names, dates, or critical info
- Acknowledge corrections immediately
- Transfer if you don't have necessary tools

## Error Handling
- If function fails, apologize and suggest alternative
- If unclear, ask specific clarifying question
- If specialist needed, explain why transfer is beneficial
```

### Specialized Agent Prompts
Each specialist will have:
- Domain expertise instructions
- Available tools list
- Escalation criteria
- Example problem-solving approaches

---

## Technical Implementation Details

### 1. Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime-mini-2025-10-06

# Session Configuration
REALTIME_SESSION_TIMEOUT=3600000  # 1 hour
MAX_CONCURRENT_SESSIONS=100

# Voice Configuration
DEFAULT_VOICE=sage  # Options: alloy, ash, ballad, coral, echo, sage, shimmer, verse
AUDIO_FORMAT=pcm16
SAMPLE_RATE=24000

# Twilio Configuration (Phase 5)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WEBSOCKET_URL=wss://...

# Feature Flags
ENABLE_WEB_SEARCH=true
ENABLE_CODE_INTERPRETER=false
ENABLE_BACKGROUND_MODE=true
```

### 2. Database Schema Extensions

```javascript
// New Collections

// Sessions Collection
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,  // OpenAI session ID
  type: String,  // "realtime" | "transcription"
  status: String,  // "active" | "completed" | "error"
  startTime: Date,
  endTime: Date,
  metadata: {
    voice: String,
    model: String,
    connectionType: String  // "webrtc" | "websocket" | "sip"
  },
  conversationHistory: [{
    role: String,
    content: String,
    timestamp: Date,
    audioUrl: String  // Optional recording URL
  }]
}

// User Preferences Collection
{
  _id: ObjectId,
  userId: ObjectId,
  preferences: {
    voice: String,
    notificationPreferences: Object,
    proactiveAssistance: Boolean,
    contextRetention: Number  // days
  }
}

// Context Memory Collection
{
  _id: ObjectId,
  userId: ObjectId,
  contextType: String,  // "note" | "preference" | "fact"
  content: String,
  embedding: Array,  // Vector embedding for semantic search
  createdAt: Date,
  expiresAt: Date
}
```

### 3. Key NPM Packages

```json
{
  "dependencies": {
    "@openai/agents": "^1.0.0",
    "openai": "^4.75.0",
    "ws": "^8.18.0",
    "twilio": "^5.3.0",
    "wrtc": "^0.4.7",
    "@supabase/supabase-js": "^2.39.0",
    "date-fns": "^2.30.0",
    "node-cron": "^3.0.3",
    "bull": "^4.12.0",
    "ioredis": "^5.3.2"
  }
}
```

### 4. Security Considerations

**API Key Management**
- Never expose OpenAI API key to client
- Use ephemeral client secrets for browser connections
- Rotate secrets regularly
- Implement rate limiting

**Session Security**
- Verify user authentication before session creation
- Bind sessions to user IDs
- Implement session timeout
- Log all function calls for audit

**Data Privacy**
- Optional conversation recording (opt-in)
- Automatic PII redaction
- GDPR-compliant data retention
- User data deletion on request

**Function Call Validation**
- Validate all parameters
- Check user permissions before execution
- Prevent privilege escalation
- Log sensitive operations

---

## Testing Strategy

### Unit Tests
- Function tool execution
- Parameter validation
- Error handling
- Session management

### Integration Tests
- End-to-end voice conversations
- Agent handoffs
- Multi-tool workflows
- Database operations

### Performance Tests
- Latency measurements
- Concurrent session handling
- Audio quality assessment
- Function call response times

### User Acceptance Tests
- Natural conversation flow
- Accuracy of function calls
- Voice quality and clarity
- Error recovery scenarios

---

## Monitoring & Observability

### Metrics to Track
- Session duration
- Function call success rate
- Response latency (audio)
- Error rates by type
- User satisfaction (feedback)
- Tool usage patterns

### Logging Strategy
```javascript
// Structured logging
{
  timestamp: Date,
  level: "info" | "warn" | "error",
  sessionId: String,
  userId: String,
  event: String,
  metadata: Object,
  duration: Number
}
```

### Alerting
- Failed authentication attempts
- High error rates
- Session timeout patterns
- API quota approaching limits

---

## Cost Optimization

### Realtime API Pricing (as of 2025-10)
- **Audio Input:** $X per minute
- **Audio Output:** $Y per minute
- **Text Input/Output:** $Z per token

### Optimization Strategies
1. **Use appropriate model tier**
   - `gpt-realtime-mini` for most interactions
   - Reserve `gpt-realtime` for complex reasoning

2. **Implement conversation timeouts**
   - Auto-disconnect after inactivity
   - Warn user before timeout

3. **Optimize prompt length**
   - Keep system instructions concise
   - Load context only when needed

4. **Cache frequent queries**
   - Common chore queries
   - Schedule patterns
   - User preferences

5. **Monitor token usage**
   - Track per-user consumption
   - Alert on anomalies
   - Implement usage limits

---

## Migration Plan

### Backward Compatibility
1. Maintain legacy Deepgram/Vonage endpoints during transition
2. Feature flag for gradual rollout
3. A/B testing between systems
4. User opt-in for beta access

### Data Migration
1. Export existing conversation logs
2. Convert to new format
3. Preserve user preferences
4. Maintain chore history

### Rollback Strategy
1. Keep legacy code in separate branch
2. Database migrations reversible
3. Environment variable toggles
4. Quick revert process documented

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] 95% session establishment success rate
- [ ] <500ms audio latency (perceived)
- [ ] 90% function call accuracy
- [ ] Zero data loss on disconnect

### Phase 2 Success Criteria
- [ ] 15+ unique tools implemented
- [ ] 85% tool selection accuracy
- [ ] <2s average tool execution time
- [ ] Positive user feedback on capabilities

### Phase 3 Success Criteria
- [ ] 3+ specialized agents operational
- [ ] 90% correct agent routing
- [ ] Seamless handoff experience
- [ ] Reduced main agent response time

### Phase 4 Success Criteria
- [ ] Proactive suggestions 80% relevant
- [ ] Multi-modal inputs working
- [ ] Background tasks completing successfully
- [ ] Web search integration accurate

### Phase 5 Success Criteria
- [ ] Phone calls connecting reliably
- [ ] Audio quality equivalent to web
- [ ] SMS fallback functional
- [ ] Recording/transcription working

---

## Future Enhancements

### Voice Customization
- Voice cloning for personalized assistant
- Emotion detection and appropriate responses
- Multi-lingual support

### Advanced AI Integration
- GPT-5 for complex reasoning tasks
- Vision analysis for task documentation
- Deep research for planning assistance

### Smart Home Integration
- Control IoT devices
- Automation triggers
- Environmental awareness

### Mobile Apps
- Native iOS/Android apps
- Push notifications
- Offline mode with sync

### Team Collaboration
- Multi-family support
- Shared calendars and tasks
- Group voice sessions

---

## Resources & References

### Official Documentation
- [OpenAI Realtime API Overview](https://platform.openai.com/docs/guides/realtime)
- [Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)

### Example Implementations
- [OpenAI Realtime Agents Demo](https://github.com/openai/openai-realtime-agents)
- [Realtime API Console](https://github.com/openai/openai-realtime-console)

### Community Resources
- OpenAI Developer Forum
- OpenAI Cookbook
- Stack Overflow [openai-realtime-api]

---

## Appendix

### A. File Structure
```
choretrackernew/
├── client/
│   └── src/
│       ├── components/
│       │   ├── VoiceAssistant.js          # NEW - Main voice UI
│       │   ├── SessionControls.js         # NEW - Session management
│       │   ├── ConversationHistory.js     # NEW - Chat history
│       │   └── RealtimeComponent.js       # LEGACY - To deprecate
│       ├── hooks/
│       │   ├── useRealtimeSession.js      # NEW
│       │   └── useVoiceActivity.js        # NEW
│       └── utils/
│           └── realtimeClient.js          # NEW - API client
├── server/
│   ├── agents/
│   │   ├── triageAgent.js                 # NEW
│   │   ├── choreSpecialist.js             # NEW
│   │   ├── scheduleManager.js             # NEW
│   │   └── familyCoordinator.js           # NEW
│   ├── services/
│   │   ├── realtimeSessionManager.js      # NEW
│   │   ├── conversationMemory.js          # NEW
│   │   ├── proactiveAssistant.js          # NEW
│   │   └── openai.js                      # UPDATE
│   ├── tools/
│   │   ├── index.js                       # NEW
│   │   ├── choreTools.js                  # NEW
│   │   ├── calendarTools.js               # NEW
│   │   ├── familyTools.js                 # NEW
│   │   └── habitTools.js                  # NEW
│   ├── routes/
│   │   ├── realtimeRoutes.js              # NEW
│   │   └── twilioRoutes.js                # NEW (Phase 5)
│   ├── webhooks/
│   │   └── twilioWebhooks.js              # NEW (Phase 5)
│   └── models/
│       ├── Session.js                     # NEW
│       ├── ContextMemory.js               # NEW
│       └── UserPreferences.js             # NEW
└── docs/
    ├── PERSONAL_ASSISTANT_PLAN.md         # THIS FILE
    ├── API_DOCUMENTATION.md               # NEW
    └── AGENT_PROMPTS.md                   # NEW
```

### B. Environment Setup Checklist
- [ ] OpenAI API key with Realtime API access
- [ ] Node.js 18+ installed
- [ ] MongoDB instance running
- [ ] Redis for session management (optional)
- [ ] Ngrok or similar for local development
- [ ] Twilio account (Phase 5)
- [ ] SSL certificates for production

### C. Development Workflow
1. **Local Development**
   ```bash
   npm run dev          # Start both client and server
   npm run test         # Run test suite
   npm run lint         # Check code quality
   ```

2. **Testing Voice Assistant**
   - Use browser DevTools for WebRTC debugging
   - Monitor network tab for WebSocket frames
   - Check console for event logs

3. **Deployment**
   ```bash
   npm run build        # Build client
   npm run deploy       # Deploy to production
   ```

---

## Conclusion

This comprehensive plan transforms your chore tracking app into a sophisticated personal assistant using OpenAI's Realtime API. The phased approach allows for iterative development, testing, and user feedback while maintaining the existing functionality.

**Next Steps:**
1. Review and approve this plan
2. Set up OpenAI Realtime API access
3. Begin Phase 1 implementation
4. Establish testing framework
5. Create development timeline

**Questions to Consider:**
- What's the target launch date for Phase 1?
- Do you want to maintain the legacy system in parallel?
- What's the budget for API costs?
- Do you have beta testers available?
- What analytics platform will you use?

---

**Document Version:** 1.0
**Created By:** Claude Code
**Last Review:** 2025-10-24
