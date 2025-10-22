# ElevenLabs Conversational AI - Proof of Concept Setup

This guide walks you through setting up the ElevenLabs integration to test their amazing voice quality with your personal assistant.

## Why ElevenLabs?

- **Superior Voice Quality**: 5,000+ ultra-realistic voices in 31 languages
- **Native Twilio Integration**: No custom WebSocket bridging required
- **Managed Platform**: Built-in ASR, TTS, and turn-taking
- **Lower Latency**: ~75ms response time
- **Function Calling**: Server tools via webhooks

## Prerequisites

1. ✅ ElevenLabs account ([sign up here](https://elevenlabs.io))
2. ✅ Your existing Twilio account credentials
3. ✅ Your server deployed and accessible (Railway, ngrok, etc.)
4. ✅ MongoDB/Supabase database running

## Step 1: Get Your ElevenLabs API Key

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app)
2. Click your profile → **Settings** → **API Keys**
3. Create a new API key
4. Add to your `.env` file:

```bash
ELEVENLABS_API_KEY=your_api_key_here
```

## Step 2: Create an ElevenLabs Conversational AI Agent

### 2.1 Create the Agent

1. Go to [ElevenLabs Agents Platform](https://elevenlabs.io/app/conversational-ai)
2. Click **Create Agent**
3. Fill in basic details:
   - **Name**: Personal Life Assistant
   - **Description**: AI-powered life coach with task, habit, and goal tracking

### 2.2 Choose a Voice

1. Browse the **Voice Library** (5,000+ voices!)
2. **Recommended voices** for conversational assistant:
   - **Aria** - Warm, friendly female voice
   - **Roger** - Calm, supportive male voice
   - **Bella** - Natural, conversational female voice
   - **Adam** - Professional, friendly male voice
3. Test different voices - this is where ElevenLabs shines! 🎤

### 2.3 Configure the LLM

1. Choose your preferred LLM:
   - **Claude Sonnet 4** (recommended for quality + cost balance)
   - **GPT-4o** (good alternative)
   - **GPT-4o mini** (fastest, cheapest)

### 2.4 Set System Prompt

**For onboarded users**, use this prompt (copy from the service):

```javascript
const elevenlabsService = require('./server/assistant/services/elevenlabsService');
console.log(elevenlabsService.getRecommendedSystemPrompt());
```

Or copy from `server/assistant/services/elevenlabsService.js` → `getRecommendedSystemPrompt()`

**For new users**, use the onboarding prompt from `getOnboardingSystemPrompt()`

**Key features of the prompt:**
- Uses `{{dynamic_variables}}` for user-specific data
- Includes active goals, tasks, habits
- References user's learning data (interests, challenges, values)
- Maintains conversational, natural tone

## Step 3: Configure Server Tools (Function Calling)

ElevenLabs needs to call your webhook endpoints when the agent wants to execute functions.

### 3.1 Add Tools to Your Agent

For each tool below, click **Add Tool** → **Webhook** in the ElevenLabs dashboard:

#### Tool 1: create_task

```
Name: create_task
Description: Create a new task or to-do item when the user mentions something they need to do
Method: POST
URL: https://your-domain.com/assistant/elevenlabs/tools/create-task
```

**Headers:**
```
Content-Type: application/json
```

**Body Parameters:**
1. **userId** (Dynamic Variable)
   - Type: Dynamic Variable
   - Value: `{{user_id}}`
   - Description: User ID from dynamic variables

2. **title** (Required)
   - Type: String
   - Description: Task title or description

3. **priority** (Optional)
   - Type: Enum
   - Values: low, medium, high, urgent
   - Description: Task priority based on urgency

4. **category** (Optional)
   - Type: Enum
   - Values: work, personal, health, learning, relationships, other
   - Description: Task category

5. **dueDate** (Optional)
   - Type: String
   - Description: Due date in ISO format (YYYY-MM-DD)

---

#### Tool 2: log_habit

```
Name: log_habit
Description: Log completion of a habit when the user reports doing something they track
Method: POST
URL: https://your-domain.com/assistant/elevenlabs/tools/log-habit
```

**Body Parameters:**
1. **userId** (Dynamic Variable): `{{user_id}}`
2. **habitName** (Required, String): Name of the habit
3. **value** (Optional, Number): Value for quantifiable habits (e.g., 45 for 45 minutes)
4. **notes** (Optional, String): Additional notes

---

#### Tool 3: update_daily_metrics

```
Name: update_daily_metrics
Description: Update daily health and wellness metrics when the user shares how they slept, their mood, energy, or exercise
Method: POST
URL: https://your-domain.com/assistant/elevenlabs/tools/update-daily-metrics
```

**Body Parameters:**
1. **userId** (Dynamic Variable): `{{user_id}}`
2. **sleepQuality** (Optional, Number): Sleep quality rating 1-10
3. **mood** (Optional, Number): Mood rating 1-10
4. **energy** (Optional, Number): Energy level 1-10
5. **exerciseMinutes** (Optional, Number): Minutes of exercise

---

#### Tool 4: create_goal

```
Name: create_goal
Description: Create a new goal when the user expresses something they want to achieve
Method: POST
URL: https://your-domain.com/assistant/elevenlabs/tools/create-goal
```

**Body Parameters:**
1. **userId** (Dynamic Variable): `{{user_id}}`
2. **title** (Required, String): Goal title
3. **category** (Optional, Enum): health, career, financial, learning, relationships, personal, other
4. **timeframe** (Required, Enum): daily, weekly, monthly, quarterly, yearly, long-term
5. **targetValue** (Optional, Number): Target value if quantifiable
6. **unit** (Optional, String): Unit for quantifiable goals

---

#### Tool 5: update_user_profile

```
Name: update_user_profile
Description: Update user profile when you learn important details during conversation
Method: POST
URL: https://your-domain.com/assistant/elevenlabs/tools/update-user-profile
```

**Body Parameters:**
1. **userId** (Dynamic Variable): `{{user_id}}`
2. **name** (Optional, String): User's preferred name
3. **timezone** (Optional, String): User's timezone
4. **onboarded** (Optional, Boolean): Mark user as onboarded
5. **aiContext** (Optional, Object): Learning data with interests, challenges, values, etc.

### 3.2 Update System Prompt for Tool Orchestration

Add this to your system prompt to guide tool usage:

```
Tool Usage Guidelines:
- Use create_task when user mentions something they need to do
- Use log_habit when user reports completing a tracked activity
- Use update_daily_metrics when user shares sleep, mood, energy, or exercise data
- Use create_goal when user expresses an achievement target
- Use update_user_profile when you learn new information about the user (interests, challenges, values, motivations)

After calling a tool, acknowledge the action naturally in conversation. For example:
- "Got it, I've added that to your tasks!"
- "Awesome! Logged that workout. You're on a 5-day streak!"
- "Perfect, I'll remember that about you."
```

## Step 4: Set Up Dynamic Variables

Dynamic variables inject user-specific context into each conversation.

### 4.1 Define Variables in System Prompt

Your system prompt already uses these variables (enclosed in `{{brackets}}`):
- `{{user_id}}` - User ID (passed to webhooks)
- `{{user_name}}` - User's name
- `{{user_timezone}}` - User's timezone
- `{{user_interests}}` - Comma-separated interests
- `{{user_challenges}}` - Current challenges
- `{{user_values}}` - Core values
- `{{active_goals}}` - Formatted list of active goals
- `{{active_tasks}}` - Formatted list of tasks
- `{{active_habits}}` - Formatted list of habits
- `{{current_time}}` - Current date/time

### 4.2 Set Placeholder Values (for testing in dashboard)

In the ElevenLabs dashboard, set placeholder values so you can test the agent:

```
user_id: 123456789
user_name: Alex
user_timezone: America/New_York
user_interests: fitness, career growth, reading
user_challenges: time management, consistency
user_values: family, growth, health
active_goals: 1. Run a marathon (health, yearly, 25% complete)
active_tasks: 1. Schedule dentist appointment [high]
active_habits: 1. Morning workout (7 day streak)
current_time: January 23, 2025, 10:30 AM
```

### 4.3 Pass Real Values at Runtime

When initiating a conversation via API (for Twilio integration), you'll pass actual user data.

Example using ElevenLabs SDK:

```javascript
const elevenlabsService = require('./server/assistant/services/elevenlabsService');

// Get user from database
const user = await User.findByPhone(phoneNumber);

// Build dynamic variables
const dynamicVars = await elevenlabsService.buildDynamicVariables(user);

// Start conversation with ElevenLabs
// (This will be handled by native Twilio integration)
```

## Step 5: Connect Twilio to ElevenLabs

ElevenLabs has a **native Twilio integration** - super easy!

### 5.1 Add Twilio Number in ElevenLabs

1. In ElevenLabs dashboard → **Integrations** → **Twilio**
2. Click **Add Integration**
3. Provide your Twilio credentials:
   - Account SID
   - Auth Token
   - Phone Number

### 5.2 ElevenLabs Auto-Configures Webhooks

ElevenLabs automatically configures:
- Voice webhook for incoming calls
- WebSocket connection for audio streaming
- All the TwiML magic

### 5.3 Assign Agent to Phone Number

1. Select your Twilio phone number
2. Assign your configured agent
3. Done! 🎉

## Step 6: Test the Integration

### 6.1 Start Your Server

```bash
cd server
npm run assistant:dev
```

Make sure your webhooks are accessible (use ngrok or Railway).

### 6.2 Test with a Phone Call

1. Call your Twilio number
2. Listen to the **amazing voice quality** from ElevenLabs! 🎤
3. Test function calling:
   - "Remind me to call mom tomorrow"
   - "I just finished a 30-minute workout"
   - "I slept 8 hours and feeling great - like a 9 out of 10"
   - "My goal is to read 12 books this year"

### 6.3 Check Server Logs

Watch for webhook calls:

```
[ElevenLabs Tool] create_task called: { userId: '...', title: 'Call mom' }
Task created: Call mom
```

### 6.4 Verify Database Updates

Check your database to confirm:
- Tasks were created
- Habits were logged
- User profile was updated

## Step 7: Compare Voice Quality

### Test Both Systems Side-by-Side

1. **OpenAI Realtime API** (current):
   - Call your number with current setup
   - Note the voice quality

2. **ElevenLabs** (new):
   - Call through ElevenLabs integration
   - Compare voice quality, naturalness, responsiveness

### What to Listen For

- **Naturalness**: Does it sound more human?
- **Emotion**: Can you hear warmth and personality?
- **Clarity**: Is pronunciation better?
- **Latency**: Is response time faster?

## Troubleshooting

### Webhooks Not Being Called

1. Check server logs for errors
2. Verify webhook URLs are publicly accessible
3. Test webhook manually with curl:

```bash
curl -X POST https://your-domain.com/assistant/elevenlabs/tools/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "title": "Test task",
    "priority": "medium"
  }'
```

### Dynamic Variables Not Working

1. Verify variable names match exactly (case-sensitive)
2. Check system prompt uses `{{variable_name}}` syntax
3. Ensure variables are passed when starting conversation

### Audio Quality Issues

1. Verify μ-law 8kHz audio format in Twilio settings
2. Check network connectivity
3. Use Twilio Voice Insights for call quality analysis

### Function Calls Not Executing

1. Check tool descriptions are clear
2. Verify userId is being passed correctly
3. Review system prompt for tool orchestration instructions
4. Check webhook response format (must return JSON)

## Next Steps

Once you've tested and confirmed it works:

1. **Full Migration**: Replace OpenAI Realtime with ElevenLabs
2. **Voice Selection**: Fine-tune voice selection for your brand
3. **Prompt Optimization**: Refine system prompts for better responses
4. **Production Deployment**: Update Twilio webhooks permanently

## Cost Comparison

| Provider | Minutes | Cost per Minute | Monthly (250 mins) |
|----------|---------|-----------------|-------------------|
| OpenAI Realtime | Voice | ~$0.15-0.20 | ~$37.50-50 |
| ElevenLabs | Voice | ~$0.08-0.12 | ~$20-30 |

**ElevenLabs is cheaper AND sounds better!** 🎯

## Resources

- [ElevenLabs Docs](https://elevenlabs.io/docs/conversational-ai)
- [ElevenLabs Twilio Integration](https://elevenlabs.io/agents/integrations/twilio)
- [Dynamic Variables Guide](https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables)
- [Server Tools Guide](https://elevenlabs.io/docs/agents-platform/customization/tools/server-tools)

## Support

Having issues? Check:
1. Server logs: `npm run assistant:dev`
2. ElevenLabs dashboard → Agent logs
3. Twilio console → Call logs
4. GitHub Issues

---

**Ready to hear the difference?** Let's test it! 🚀
