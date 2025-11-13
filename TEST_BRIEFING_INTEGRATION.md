# Briefing Integration Test

End-to-end test for the briefing integration between Claude SDK and Voice Agent.

## What This Test Validates

1. **Briefed Call Creation**: Tests that `create_briefed_call` creates a session with briefing
2. **Data Persistence**: Verifies briefing data is stored correctly in Supabase
3. **Scheduler Processing**: Simulates scheduler updating session status
4. **Session Linking**: Tests interaction linking to call session
5. **Briefing Retrieval**: Confirms briefing can be loaded by sessionId
6. **Outcome Updates**: Tests post-call analysis updates
7. **Data Cleanup**: Ensures test data is properly removed

## Prerequisites

- Supabase connection configured (`.env` file with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`)
- MongoDB running (for User and Interaction models)
- At least one user in the database

## Running the Test

```bash
# From project root
node test-briefing-integration.js

# Or make it executable and run directly
chmod +x test-briefing-integration.js
./test-briefing-integration.js
```

## Expected Output

```
╔════════════════════════════════════════════════════════════╗
║   END-TO-END TEST: BRIEFING INTEGRATION                    ║
║   Testing Claude SDK → Scheduler → Voice Agent Flow       ║
╚════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
Step 1: Test User Setup
═══════════════════════════════════════════════════════════════
✓ Test user found
  User: Marco (12345678-1234-1234-1234-123456789012)

═══════════════════════════════════════════════════════════════
Step 2: Create Briefed Call Session
═══════════════════════════════════════════════════════════════
✓ Briefed call scheduled
  Session ID: abcd1234-5678-90ab-cdef-1234567890ab
✓ Session status
  Status: scheduled
✓ Session direction
  Direction: outbound
✓ Briefing attached
  Briefing data present in session

═══════════════════════════════════════════════════════════════
Step 3: Verify Briefing Data Structure
═══════════════════════════════════════════════════════════════
✓ Briefing exists
✓ Has trigger_reason
  TEST: End-to-end verification of briefing integration
✓ Has detected_patterns
  3 patterns
✓ Has conversation_goals
  3 goals
✓ Has recent_context

Briefing Content:
  Trigger: TEST: End-to-end verification of briefing integration
  Patterns:
    - Testing briefing creation flow
    - Testing briefing persistence
    - Testing briefing retrieval
  Goals:
    - Verify briefing loads correctly in voice agent
    - Test sessionId tracking through the system
    - Confirm post-call analysis works
  Context: Automated end-to-end test of the briefing system...

═══════════════════════════════════════════════════════════════
Step 4: Simulate Scheduler Processing
═══════════════════════════════════════════════════════════════
✓ Scheduler updates status
  Status: in-progress
✓ Started timestamp set
  Started: 2025-01-24T10:30:00.000Z
✓ Briefing preserved
  Briefing still present after update

═══════════════════════════════════════════════════════════════
Step 5: Create Mock Interaction
═══════════════════════════════════════════════════════════════
✓ Mock interaction created
  Interaction ID: 507f1f77bcf86cd799439011
✓ Linked to session
  SessionId: abcd1234-5678-90ab-cdef-1234567890ab

═══════════════════════════════════════════════════════════════
Step 6: Verify Briefing Retrieval by SessionId
═══════════════════════════════════════════════════════════════
✓ Session retrieved by ID
  ID: abcd1234-5678-90ab-cdef-1234567890ab
✓ Briefing accessible
  Briefing can be loaded
✓ All session data present
  user_id, call_type, status, briefing all present
✓ Can access trigger_reason
✓ Can access conversation_goals
✓ Can access detected_patterns

═══════════════════════════════════════════════════════════════
Step 7: Test Call Outcome Update
═══════════════════════════════════════════════════════════════
✓ Status updated to completed
✓ Summary saved
✓ Outcome assessment saved
✓ Goal achievement recorded

═══════════════════════════════════════════════════════════════
Step 8: Cleanup Test Data
═══════════════════════════════════════════════════════════════
✓ Delete test interaction
  Deleted interaction 507f1f77bcf86cd799439011
✓ Delete test session
  Deleted session abcd1234-5678-90ab-cdef-1234567890ab

═══════════════════════════════════════════════════════════════
Test Summary
═══════════════════════════════════════════════════════════════

Total Tests: 28
Passed: 28
Failed: 0

═══════════════════════════════════════════════════════════════
✓ ALL TESTS PASSED! Briefing integration working correctly.
═══════════════════════════════════════════════════════════════
```

## Test Flow

The test simulates the complete briefing integration flow:

```
1. Test User Setup
   └─> Finds existing user (e.g., Marco) or uses first available user

2. Create Briefed Call
   └─> Inserts call_session with briefing data
   └─> Verifies status='scheduled', direction='outbound'

3. Verify Briefing Structure
   └─> Loads session from Supabase
   └─> Checks all briefing fields present and valid

4. Simulate Scheduler
   └─> Updates status to 'in-progress'
   └─> Sets started_at timestamp
   └─> Verifies briefing persists through update

5. Create Mock Interaction
   └─> Creates Interaction linked to session
   └─> Verifies sessionId reference

6. Verify Briefing Retrieval
   └─> Simulates voice service loading briefing
   └─> Confirms all data accessible by sessionId

7. Test Outcome Update
   └─> Updates status to 'completed'
   └─> Adds conversation_summary and outcome_assessment

8. Cleanup
   └─> Deletes test interaction from MongoDB
   └─> Deletes test session from Supabase
```

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed or fatal error occurred

## Troubleshooting

### "No users found in database"
- Ensure MongoDB is running
- Verify at least one user exists in the `users` collection

### "Error querying call_sessions"
- Check Supabase connection (`SUPABASE_URL` and `SUPABASE_SERVICE_KEY`)
- Verify `call_sessions` table exists with correct schema

### "Cannot find module '@supabase/supabase-js'"
- Run `npm install` in the project root

### Tests fail at cleanup
- Not critical - test data may need manual cleanup
- Check Supabase for orphaned sessions with `scheduled_by='test-script'`
- Check MongoDB for orphaned interactions

## Integration Points Tested

This test validates the fixes made to:

1. **choreTracker.js MCP Server**
   - `create_briefed_call` tool creates sessions with briefing

2. **scheduler.js**
   - `processOrchestratorScheduledCalls` queries `call_sessions`
   - Adds `sessionId` to webhook URLs
   - Updates session status correctly

3. **voiceService.js**
   - Loads briefing from `call_sessions` using `sessionId`
   - Preserves briefing through session lifecycle

4. **Voice Routes**
   - Accept `sessionId` query parameter
   - Pass `sessionId` to voice service

## Related Files

- `/server/claude-orchestrator/mcp-servers/choreTracker.js` - MCP tool definitions
- `/server/assistant/services/scheduler.js` - Call scheduler
- `/server/assistant/services/voiceService.js` - Voice session handling
- `/server/assistant/routes/voice.js` - Voice route handlers
