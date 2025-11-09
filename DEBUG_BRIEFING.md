# Debugging Briefing Not Loading

## Issue
The AI spoke about "washing clothes" instead of using the gym briefing, indicating the briefing wasn't injected into the system prompt.

## Checks to Perform

### 1. Verify Briefing Exists in Database
Run this in Supabase SQL Editor:

```sql
SELECT
  id,
  user_id,
  call_type,
  status,
  briefing,
  scheduled_for,
  created_at
FROM call_sessions
WHERE call_type = 'scolding'
  AND briefing IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: You should see your test call with the gym briefing as a JSON object.

**If briefing is NULL**: The test call was created without a briefing. Re-create it with:

```sql
INSERT INTO call_sessions (
  user_id,
  direction,
  call_type,
  status,
  briefing,
  scheduled_for,
  scheduled_by
) VALUES (
  '5899f756-7e21-4ef2-a6f6-9b13e43efba5'::uuid,
  'outbound',
  'scolding',
  'scheduled',
  '{"trigger_reason": "Testing the briefing system - user has been slacking on gym", "detected_patterns": ["Skipped gym 3 days in a row", "Making excuses about being tired"], "conversation_goals": ["Get commitment for tomorrow morning", "Address the tiredness excuse"], "recent_context": "Last workout was Monday. Today is Saturday."}'::jsonb,
  NOW(),
  'claude-sdk'
);
```

### 2. Check Logs for Briefing Loading

Search your Railway logs for these exact strings:

- `[BRIEFING] ✓ Loaded briefing for session` - **MUST appear if briefing was loaded**
- `[BRIEFING] Error loading session` - appears if database query failed
- `[BRIEFING] Exception loading briefing` - appears if exception thrown
- `[BRIEFING] ✓ Injected briefing into system prompt` - **MUST appear if briefing was added**
- `Extracted parameters:` - shows what sessionId was received from Twilio

### 3. Check if sessionId is in the Twilio Start Message

Look for the "Start message received:" log and check if it includes sessionId in customParameters.

## Likely Root Causes

### A. Briefing Not in Database
- You created the call without the `briefing` field
- **Fix**: Use the SQL INSERT above

### B. sessionId Not Passed to Voice Service
- WebSocket start message doesn't include sessionId
- **Fix**: Verify route passes it correctly (already checked, looks good)

### C. JSONB Format Issue
- Briefing stored as text instead of JSONB
- **Fix**: Use `::jsonb` cast when inserting (see SQL above)

## Next Steps

1. Run the SELECT query above and share the results
2. Search your logs for `[BRIEFING]` and share what you find
3. If briefing is null, run the INSERT query to create a proper test call
