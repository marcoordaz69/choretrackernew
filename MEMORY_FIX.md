# Voice Assistant Memory Fix

## The Problem

When you call Luna, she doesn't remember anything about you because the session instructions are **hardcoded** instead of loading your user context from the database.

## Root Cause

**File:** `server/assistant/services/voiceService.js`

**Line 93:** Uses hardcoded static instructions
```javascript
instructions: `Personality and Tone...` // ❌ STATIC - no user context!
```

**Lines 476-578:** Has a `getVoiceInstructions(user)` method that:
- Loads your name, timezone, preferences
- Gets your active goals, tasks, habits
- Includes your interests, challenges, values
- References past conversations
- **BUT IT'S NEVER CALLED!**

## The Fix

Replace hardcoded instructions with dynamic user context.

### Change Required

**File:** `server/assistant/services/voiceService.js`

**Line 15-22:** Add user fetching
```javascript
async handleVoiceStream(ws, userId, callSid, streamSid) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for voice stream');
      ws.close();
      return;
    }
```
✅ This already exists!

**Line 86-149:** Replace static instructions with dynamic ones

**BEFORE (Line 93):**
```javascript
instructions: `Personality and Tone

Identity
You are Luna, a warm, engaging personal assistant...
[40+ lines of hardcoded text]
`,
```

**AFTER (Line 93):**
```javascript
instructions: await this.getVoiceInstructions(user),
```

That's it! One line change.

## What This Fixes

After this change, Luna will:
- ✅ Know your name and use it
- ✅ Remember your timezone
- ✅ See your active tasks, goals, and habits
- ✅ Know your interests and challenges
- ✅ Reference what you've told her before
- ✅ Provide personalized suggestions
- ✅ Track your progress over time

## What `getVoiceInstructions(user)` Actually Does

From lines 476-578:

### For New Users (Not Onboarded):
```javascript
if (!user.onboarded) {
  return `You are a personal life assistant calling to introduce yourself...

  This is your FIRST conversation with this person. Your goal is to LEARN about them:
  1. Ask for their name
  2. Learn what they'd like help with
  3. Understand their challenges
  4. Get a sense of their values

  CRITICAL - Use update_user_profile function to save what you learn:
  - name, interests, challenges, values, motivations, communicationStyle
  - onboarded: true (when done)`;
}
```

### For Existing Users:
```javascript
return `You are ${user.name}'s personal life assistant speaking on a phone call.

Voice & Tone: Warm and friendly, calm and natural...

User context:
- Name: ${user.name}
- Timezone: ${user.timezone}
- Personality preference: ${user.ai_context?.personality}

${userContext}  // Interests, challenges, values, motivations

${activeGoals}   // Current goals with progress
${activeTasks}   // Pending tasks with priorities
${activeHabits}  // Habits with current streaks

Current time: ${new Date().toLocaleString()}

Remember: Track new information with update_user_profile`;
```

## Example: What Luna Will Know

**Before Fix:**
```
Luna: "Hey there! What can I help you with today?"
You: "What are my tasks for tomorrow?"
Luna: "I don't have access to your tasks. What would you like to add?"
```

**After Fix:**
```
Luna: "Hey Dad! What can I help you with today?"
You: "What are my tasks for tomorrow?"
Luna: "You have 3 tasks tomorrow:
  1. Finish proposal (high priority, due 2pm)
  2. Gym at 6pm (part of your fitness goal)
  3. Call mom (you mentioned this last week)

  Want me to help you prepare for any of these?"
```

## Testing the Fix

After making the change:

1. **Restart server:**
   ```bash
   npm run assistant:dev
   ```

2. **Call your Twilio number**

3. **First call (if not onboarded):**
   - Luna should ask your name
   - Learn about your goals/challenges
   - Use `update_user_profile` to remember

4. **Second call:**
   - Luna should know your name
   - Reference your tasks/goals/habits
   - Show continuity from first call

5. **Add a task via SMS:**
   ```
   Text: "Remind me to buy groceries tomorrow"
   ```

6. **Call again:**
   - Luna should mention the grocery task
   - Reference it as part of your schedule

## Additional Enhancements (Optional)

### 1. Add More Context to Instructions

If you want even MORE memory, you can enhance `getVoiceInstructions`:

```javascript
// Around line 571, add:
const recentInteractions = await Interaction.find({ userId: user.id })
  .sort({ timestamp: -1 })
  .limit(5)
  .lean();

const conversationContext = recentInteractions.length > 0
  ? `\n\nRecent conversations:\n${recentInteractions.map(i =>
      `- ${new Date(i.timestamp).toLocaleDateString()}: ${i.content.userMessage || i.content.transcript}`
    ).join('\n')}`
  : '';

// Then in the return statement, add:
${conversationContext}
```

### 2. Ensure update_user_profile is Called

Add to Luna's instructions (line 576):

```javascript
When ${user.name} shares new information about their challenges, victories, interests, or values,
IMMEDIATELY use update_user_profile to remember it. Examples:
- "I'm working on losing weight" → update challenges: ["weight loss"]
- "I love hiking" → update interests: ["hiking"]
- "Family is everything to me" → update values: ["family"]
```

### 3. Proactive Memory Prompts

Add to instructions:

```javascript
If you notice ${user.name} mentions something important that you should remember, ask:
"Should I remember that for next time?"

Then use update_user_profile to save it.
```

## Verification Checklist

After implementing the fix:

- [ ] Server restarts without errors
- [ ] Call connects successfully
- [ ] Luna uses your name (if onboarded)
- [ ] Luna references your tasks/goals/habits
- [ ] Luna asks to learn about you (if first call)
- [ ] `update_user_profile` is called when you share info
- [ ] Second call shows continuity from first call
- [ ] Luna knows your timezone (uses correct time references)

## Database Check

Verify data is being saved:

```javascript
// In MongoDB/Supabase console:
db.users.findOne({ phone: "YOUR_PHONE_NUMBER" })

// Should show:
{
  name: "Your Name",
  onboarded: true,
  ai_context: {
    personality: "supportive and calm",
    learningData: {
      interests: ["fitness", "productivity"],
      challenges: ["time management"],
      values: ["family", "growth"],
      motivations: ["..."],
      recentWins: ["..."]
    }
  }
}
```

## The Root Issue

Your assistant has **TWO BRAINS**:

1. **The Smart Brain** (`getVoiceInstructions`) - Has all your data ✅
2. **The Dumb Brain** (hardcoded instructions) - Knows nothing ❌

**Current code uses the dumb brain.**

**Fix: Use the smart brain.**

---

**Implementation Time:** 2 minutes
**Impact:** Transforms Luna from stranger to assistant who knows you
**Risk:** Zero - just using code that already exists
