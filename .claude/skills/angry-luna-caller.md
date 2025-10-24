---
name: angry-luna-caller
description: Create custom scolding/intervention calls from Luna with any message - use when user wants Luna to call and be mad/disappointed about something specific
---

# Angry Luna Caller Skill

Use this skill when the user wants Luna to call them and scold/lecture/be disappointed about something specific.

## When to Use

**Trigger phrases:**
- "Have Luna call me and be mad about..."
- "Make Luna scold me for..."
- "Luna should yell at me about..."
- "Create an angry call about..."
- "Intervention call for..."

## Implementation Steps

### 1. Gather Requirements

Ask the user (if not already provided):
- **What should Luna be mad about?** (e.g., "missing laundry 3 times", "skipping gym", "eating junk food")
- **How severe?** (disappointed / frustrated / angry / furious)
- **Opening line?** (default: "{Name}! We need to talk.")

### 2. Generate Dynamic Instructions

Create custom instructions following this template:

```javascript
const scoldingInstructions = `You are Luna, ${user.name}'s personal assistant, and you are [EMOTION].

${user.name} has [SPECIFIC OFFENSE]! This is unacceptable!

Your job right now is to SCOLD them firmly but with tough love:
- Start with: "${user.name}! We need to talk. Do you know what you've done?"
- Express [EMOTION]: "[Specific complaint about the offense]"
- Be stern: "[Why this is a problem]"
- Demand accountability: "[Question about why this happened]"
- Push for commitment: "I need you to promise me you'll [CORRECTIVE ACTION]. No excuses!"
- End with tough love: "I'm only hard on you because I care. You're better than this!"

Be DIRECT, FIRM, and EMOTIONAL. Don't hold back. This is an intervention!`;
```

### 3. Update Code Files

You need to modify these files:

#### A. Create Custom Route (server/assistant/routes/voice.js)

Add a new route for the custom scolding:

```javascript
router.post('/custom-scolding-[TOPIC]', (req, res) => {
  const { userId } = req.query;

  const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

  const twiml = twilioService.generateAIVoiceTwiML(
    websocketUrl,
    "[Opening line]",
    userId,
    req.body.CallSid,
    '[custom-mode-name]'
  );

  res.type('text/xml').send(twiml);
});
```

**OR** (Better approach) - Make it fully dynamic:

```javascript
router.post('/custom-scolding', (req, res) => {
  const { userId, mode } = req.query;

  const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

  const twiml = twilioService.generateAIVoiceTwiML(
    websocketUrl,
    `${userName}! We need to talk.`,
    userId,
    req.body.CallSid,
    mode  // Pass the custom mode
  );

  res.type('text/xml').send(twiml);
});
```

#### B. Update voiceService.js Instructions

In `server/assistant/services/voiceService.js`, update the `handleVoiceStream` method to handle the new custom mode:

```javascript
// Around line 86-104
let instructions;
if (customMode === 'scolding') {
  // Existing laundry scolding
  instructions = `[Hardcoded laundry scolding]`;
} else if (customMode === '[new-mode-name]') {
  // New custom scolding
  instructions = `[Generated instructions from step 2]`;
} else {
  instructions = await this.getVoiceInstructions(user);
}
```

**BETTER APPROACH** - Make it fully dynamic by passing the topic:

Extract the scolding topic from customMode like `scolding:gym` or `scolding:junk-food`:

```javascript
let instructions;
if (customMode && customMode.startsWith('scolding:')) {
  const topic = customMode.replace('scolding:', '');

  // Map topic to scolding instructions
  const scoldingMap = {
    'laundry': {
      offense: 'missed washing clothes for the THIRD TIME this month',
      problem: "You're losing track of basic responsibilities!",
      action: 'do it TODAY'
    },
    'gym': {
      offense: 'skipped the gym FOUR TIMES this week',
      problem: "Your fitness goals are slipping away!",
      action: 'get to the gym RIGHT NOW'
    },
    'junk-food': {
      offense: 'eaten junk food every day this week',
      problem: "You're sabotaging your health goals!",
      action: 'eat clean starting today'
    }
    // Add more as needed
  };

  const config = scoldingMap[topic] || {
    offense: 'not following through on your commitments',
    problem: "You're better than this!",
    action: 'get back on track immediately'
  };

  instructions = `You are Luna, ${user.name}'s personal assistant, and you are DISAPPOINTED and FRUSTRATED.

${user.name} has ${config.offense}! This is unacceptable!

Your job right now is to SCOLD them firmly but with tough love:
- Start with: "${user.name}! We need to talk. Do you know what you've done?"
- Express disappointment: "You've ${config.offense}!"
- Be stern: "${config.problem}"
- Demand accountability: "What's going on? Why are you letting this slip?"
- Push for commitment: "I need you to promise me you'll ${config.action}. No excuses!"
- End with tough love: "I'm only hard on you because I care. You're better than this!"

Be DIRECT, FIRM, and EMOTIONAL. Don't hold back. This is an intervention!`;

} else {
  instructions = await this.getVoiceInstructions(user);
}
```

### 4. Create/Update Test Script

Create a reusable test script:

```javascript
#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const twilioService = require('./server/assistant/services/twilioService');

async function triggerScoldingCall(topic = 'laundry') {
  try {
    console.log('🔍 Looking for user named Marco...');

    const users = await User.findAll();
    const marco = users.find(u => u.name && u.name.toLowerCase().includes('marco'));

    if (!marco) {
      console.error('❌ No user found with name containing "Marco"');
      return;
    }

    console.log(`✅ Found user: ${marco.name} (${marco.phone})`);
    console.log(`😠 Initiating ${topic.toUpperCase()} scolding call...`);

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/custom-scolding?userId=${marco.id}&mode=scolding:${topic}`;

    await twilioService.makeCall(marco.phone, webhookUrl);

    console.log('✅ Scolding call initiated!');
    console.log(`📱 Prepare to be yelled at about ${topic}...`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get topic from command line or use default
const topic = process.argv[2] || 'laundry';
triggerScoldingCall(topic);
```

**Usage:**
```bash
node trigger-scolding.js laundry
node trigger-scolding.js gym
node trigger-scolding.js junk-food
```

### 5. Add New Topics Dynamically

To add a new scolding topic:

1. Add to the `scoldingMap` in voiceService.js
2. No new routes needed if using dynamic approach
3. Just call with: `node trigger-scolding.js [new-topic]`

## Example: Adding "Sleep Schedule" Scolding

```javascript
// In voiceService.js scoldingMap:
'sleep': {
  offense: 'stayed up past 2am FIVE NIGHTS in a row',
  problem: "Your sleep schedule is a disaster!",
  action: 'be in bed by 11pm tonight'
}
```

**Trigger:**
```bash
node trigger-scolding.js sleep
```

## Full Implementation Checklist

When implementing a custom scolding:

- [ ] Identify what Luna should be mad about
- [ ] Determine emotion level (disappointed → furious)
- [ ] Add entry to `scoldingMap` in voiceService.js
- [ ] Ensure route handles dynamic `mode` parameter
- [ ] Test locally with trigger script
- [ ] Commit and push to production
- [ ] Wait 2-3 min for Railway deploy
- [ ] Trigger call with: `node trigger-scolding.js [topic]`

## Current Implementation Status

**Existing routes:**
- `/assistant/voice/outbound-reflection` - Normal reflection call
- `/assistant/voice/custom-scolding` - Dynamic scolding endpoint

**Existing topics:**
- `laundry` - Missing laundry 3x this month
- (Add more as configured)

**File locations:**
- Route: `server/assistant/routes/voice.js:85-100`
- Logic: `server/assistant/services/voiceService.js:86-104`
- Test: `test-custom-call.js`

## Quick Usage

**For user (via you):**
User says: "Have Luna call and yell at me about skipping the gym"

**Your response:**
1. Check if 'gym' exists in scoldingMap
2. If not, add it with appropriate offense/problem/action
3. Commit and push changes
4. Wait for deploy
5. Run: `node trigger-scolding.js gym`
6. User gets angry call about gym skipping

## Notes

- Luna uses Marin voice (warm but can be stern)
- Calls use OpenAI Realtime API (gpt-realtime-mini-2025-10-06)
- All user context/memory is still loaded (name, tasks, goals, etc.)
- Only the instructions are overridden to be angry
- Function tools are still available (can create tasks, log habits, etc.)
- Calls save to Interaction history

## Advanced: Fully Custom Instructions

For one-off custom scoldings without editing code:

Create a temporary route that accepts instructions as a parameter (NOT RECOMMENDED for production - security risk):

```javascript
router.post('/custom-scolding-adhoc', (req, res) => {
  const { userId, instructions } = req.query;
  // Validate and sanitize instructions
  // Store in session metadata
  // Pass through as customMode
});
```

Better approach: Add topics to scoldingMap via config file or database.
