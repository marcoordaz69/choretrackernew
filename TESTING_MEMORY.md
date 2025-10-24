# Testing Luna's Memory - Quick Guide

## What Just Changed

### Before Fix:
```javascript
instructions: `[Hardcoded text with no user data]`
```

### After Fix:
```javascript
instructions: await this.getVoiceInstructions(user)
```

**This loads:**
- ✅ Your name and uses it in conversation
- ✅ Your timezone (correct time references)
- ✅ Your interests, challenges, values, motivations
- ✅ Your active goals with progress
- ✅ Your pending tasks with priorities and due dates
- ✅ Your active habits with current streaks
- ✅ Recent wins you've shared
- ✅ Communication style preferences

---

## How to Test

### Step 1: Restart Server

```bash
cd /home/tradedad/choretrackernew
npm run assistant:dev
```

Watch for:
```
✓ Personal Assistant initialized successfully
✓ Voice webhooks: /assistant/webhooks/voice/incoming
✓ Voice stream: ws://your-domain/assistant/voice/stream
```

### Step 2: First Call (Onboarding)

**Call your Twilio number**

**Luna should say:**
> "Hey there! I'm your new personal assistant, calling to introduce myself and learn a bit about you. First off, what should I call you?"

**You say:**
> "I'm [Your Name]"

**Luna asks:**
> "Great to meet you, [Your Name]! So, what brings you here? What are you hoping I can help you with?"

**You say:**
> "I need help managing my tasks and staying on top of my goals"

**Luna asks:**
> "What's your biggest challenge right now?"

**You say:**
> "Time management and staying consistent with my habits"

**Luna asks:**
> "What matters most to you?"

**You say:**
> "Family and personal growth"

**What's happening behind the scenes:**
Luna is calling `update_user_profile` to save:
```javascript
{
  name: "[Your Name]",
  onboarded: true,
  ai_context: {
    learningData: {
      challenges: ["time management", "staying consistent"],
      values: ["family", "personal growth"]
    }
  }
}
```

### Step 3: Create Tasks/Goals/Habits

**After onboarding, test the tools:**

**Create a task:**
> "Remind me to call mom tomorrow at 2pm"

**Luna should:**
- Call `create_task` function
- Confirm: "Got it! I'll remind you to call mom tomorrow at 2pm"

**Create a goal:**
> "I want to lose 10 pounds by June"

**Luna should:**
- Call `create_goal` function
- Confirm: "Great goal! I'll track your progress toward losing 10 pounds by June"

**Log a habit:**
> "I went to the gym for 45 minutes today"

**Luna should:**
- Call `log_habit` function
- Check streak
- Confirm: "Awesome! 45 minutes at the gym. [X] day streak!"

### Step 4: Call Again (Memory Test)

**Hang up and call back immediately**

**Luna should say:**
> "Hey [Your Name]! What can I help you with today?"

(Notice she uses your name!)

**You ask:**
> "What do I have coming up?"

**Luna should:**
- Reference your task: "You have 'call mom' tomorrow at 2pm"
- Reference your goal: "You're working on losing 10 pounds by June"
- Reference your habit: "You hit the gym today - nice work on your [X] day streak"

**You ask:**
> "What do you know about me?"

**Luna should:**
- Mention your challenges: "You're working on time management and staying consistent"
- Mention your values: "Family and personal growth are important to you"
- Reference recent conversation: "We talked about..."

### Step 5: Update Memory Test

**During the call:**
> "By the way, I'm also really passionate about fitness and health"

**Luna should:**
- Recognize this as new information
- Call `update_user_profile`
- Add "fitness" and "health" to your interests
- Confirm: "Got it, I'll remember that!"

**Call back again:**

**Luna should:**
- Reference your interests: "Given your interest in fitness and health..."

---

## Verification Checklist

After testing, verify these work:

- [ ] Luna uses your name consistently
- [ ] Luna knows your current time/timezone
- [ ] Luna references your tasks when you ask about schedule
- [ ] Luna knows your active goals and progress
- [ ] Luna tracks your habit streaks correctly
- [ ] Luna remembers your interests/challenges/values
- [ ] Second call shows continuity from first call
- [ ] Luna uses `update_user_profile` when you share new info
- [ ] Luna references past wins you've mentioned
- [ ] Luna adapts to your communication style preference

---

## Database Verification

Check what's actually being saved:

### Via Code:
```javascript
// In server console or test script
const User = require('./server/assistant/models/User');
const user = await User.findOne({ phone: "YOUR_PHONE_NUMBER" });
console.log(JSON.stringify(user, null, 2));
```

### Should show:
```json
{
  "name": "Your Name",
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "onboarded": true,
  "ai_context": {
    "personality": "supportive and calm",
    "learningData": {
      "interests": ["fitness", "health"],
      "challenges": ["time management", "staying consistent"],
      "values": ["family", "personal growth"],
      "motivations": [],
      "recentWins": [],
      "communicationStyle": "direct and conversational"
    }
  }
}
```

### Check Tasks:
```javascript
const Task = require('./server/assistant/models/Task');
const tasks = await Task.find({ userId: user._id });
console.log(tasks);
```

### Check Goals:
```javascript
const Goal = require('./server/assistant/models/Goal');
const goals = await Goal.find({ userId: user._id });
console.log(goals);
```

### Check Habits:
```javascript
const Habit = require('./server/assistant/models/Habit');
const habits = await Habit.find({ userId: user._id });
console.log(habits);
```

---

## What Luna Now Knows Example

**Sample Session After Using for a Week:**

**You call Luna:**

**Luna:**
> "Hey Dad! Good afternoon. How's it going?"

**You:**
> "What's on my plate for tomorrow?"

**Luna:**
> "Let me check... Tomorrow you've got:
>
> 1. Call mom at 2pm - you mentioned she wanted to chat about Thanksgiving
> 2. Gym session at 6pm - you're on a 12-day streak, crushing it!
> 3. Finish the proposal - that's high priority, due by end of day
>
> You're also working toward your goal of losing 10 pounds by June - you're down 3 pounds so far!
>
> Want to add anything else or adjust those?"

**You:**
> "Actually, can we move the gym to 7pm?"

**Luna:**
> "Absolutely. I'll reschedule your gym session from 6pm to 7pm tomorrow. All set!"

**You:**
> "Thanks. And I just finished a big project at work today."

**Luna:**
> "That's fantastic! Congrats on wrapping that up. I know time management has been tough for you lately, so finishing a big project is a real win. Should I remember this as one of your recent victories?"

**You:**
> "Yeah, definitely."

**Luna:**
> "Got it - added to your wins. You're making progress! Anything else I can help with?"

---

## Debugging Issues

### Luna doesn't remember anything:
1. Check server logs for errors
2. Verify `getVoiceInstructions` is being called (should log)
3. Check database - does user have data?
4. Verify userId is being passed correctly to `handleVoiceStream`

### Luna knows old data but not new:
1. Check if `update_user_profile` function is being called
2. Look at Interaction logs - are function calls executing?
3. Verify database write permissions

### Luna mentions tasks but they're outdated:
1. Check Task model - are tasks being marked complete?
2. Query should filter by `status: 'pending'`
3. Verify `getActiveTasksContext` is working

### Luna doesn't use my name:
1. Check if `user.name` is set in database
2. Verify onboarding completed (`user.onboarded === true`)
3. Check if `getVoiceInstructions` is using `${user.name}` correctly

---

## Server Logs to Watch

When you call, you should see:

```
Voice stream started for Dad (+1234567890)
[SESSION CONFIG] Using gpt-realtime-mini-2025-10-06 with Luna persona and marin voice
[SESSION CONFIG] Sending 5 function tools to OpenAI
OpenAI Realtime API connected
Session created: sess_xxxxx
User said: [your message]
[FUNCTION CALL] Executing: create_task { title: "Call mom", dueDate: "..." }
[FUNCTION CALL] Result: { type: "task_created", data: {...} }
AI said: [Luna's response]
```

If you see:
- `User said:` ✅ Transcription working
- `[FUNCTION CALL] Executing:` ✅ Tools being called
- `AI said:` ✅ Response generating

---

## Success! You'll Know It's Working When:

1. **First call:** Luna asks your name and learns about you
2. **Second call:** Luna greets you by name
3. **Task creation:** "Remind me to X" → Luna confirms and saves
4. **Schedule query:** "What's tomorrow?" → Luna lists your actual tasks
5. **Goal tracking:** "How's my goal?" → Luna knows your progress
6. **Habit streaks:** "Logged gym" → Luna celebrates your streak
7. **Memory test:** "What do you know about me?" → Luna recites interests/challenges/values
8. **Continuity:** Call 10 times → Luna references ALL previous conversations

---

**🎉 Your personal assistant now has a working memory!**
