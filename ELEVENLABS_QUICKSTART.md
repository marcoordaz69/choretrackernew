# ElevenLabs Quick Start - Just Get It Working!

## Goal: Call your Twilio number and hear an amazing ElevenLabs voice

**Time: 5 minutes**

---

## Step 1: Create an ElevenLabs Agent (2 mins)

1. Go to https://elevenlabs.io/app/conversational-ai
2. Click **"Create Agent"**
3. Fill in:
   - **Name**: Personal Assistant
   - **Description**: AI voice assistant
4. Click **Create**

---

## Step 2: Choose a Voice (1 min) 🎤

This is the fun part! Pick a voice:

### Recommended Voices:
- **Aria** - Warm, friendly female
- **Roger** - Calm, supportive male
- **Bella** - Natural conversational female
- **Adam** - Professional male
- **Charlotte** - Energetic female
- **Chris** - Casual male

**Try a few!** Click each voice and listen to the sample. This is why you're switching to ElevenLabs!

---

## Step 3: Set a Simple Prompt (30 seconds)

In the **System Prompt** field, paste this:

```
You are a friendly personal assistant. Be warm, conversational, and helpful. Keep responses concise since this is a phone call. Listen carefully and respond naturally.
```

**First Message** (what the agent says when you call):
```
Hey! Thanks for calling. How can I help you today?
```

---

## Step 4: Choose LLM (30 seconds)

Pick one:
- **Claude Sonnet 4** (recommended - best quality)
- **GPT-4o mini** (fastest and cheapest)

---

## Step 5: Connect Your Twilio Number (1 min)

1. In the ElevenLabs agent settings, find **Phone** section
2. Click **Add Phone Number**
3. Select **Twilio**
4. Enter your Twilio credentials:
   - **Account SID**: (from `.env` or Twilio console)
   - **Auth Token**: (from `.env` or Twilio console)
   - **Phone Number**: Your Twilio number (e.g., +1234567890)
5. Click **Connect**

**ElevenLabs will automatically configure Twilio for you!**

---

## Step 6: TEST IT! 📞

**Call your Twilio number right now.**

You should hear the amazing ElevenLabs voice!

---

## What to Test

Try saying:
- "How are you?"
- "Tell me a joke"
- "What's the weather like?"
- "Help me plan my day"

Just have a natural conversation and **enjoy that voice quality**!

---

## Troubleshooting

### "Call fails or disconnects"
- Check Twilio credentials are correct
- Verify phone number format: +1234567890

### "I don't hear anything"
- Check your phone volume
- Try calling again (sometimes first call has issues)

### "Voice is robotic/bad"
- Make sure you picked an ElevenLabs voice (not default)
- Try a different voice from the library

### "Connection error"
- Wait 30 seconds and try again
- Check ElevenLabs dashboard for error logs

---

## Next: Add Your User Context (Optional)

Once it's working, you can make it personal:

### Add Dynamic Variables to the Prompt:

Replace the simple prompt with this:

```
You are {{user_name}}'s personal assistant. Be warm, conversational, and helpful.

Current date: {{current_date}}
User's timezone: {{user_timezone}}

Keep responses concise since this is a phone call. Listen carefully and respond naturally.
```

Then when setting up the integration, you can pass user-specific data.

But for now - **just enjoy talking to it!** 🎉

---

## Cost

Voice calls cost about **$0.08-0.12 per minute** on ElevenLabs.

First 15 minutes are **FREE** on the free tier!

---

**That's it! Call your number and hear the difference.** 🚀
