# ElevenLabs API Quick Start - No Dashboard Required! 🚀

**Get those amazing ElevenLabs voices working in 5 minutes via API only.**

## Step 1: Create an Agent (Python)

```bash
# Install dependencies (if not already)
pip install requests python-dotenv

# List available voices
python create-elevenlabs-agent.py list-voices

# Create agent with default voice (Rachel - warm female)
python create-elevenlabs-agent.py

# Or create with specific voice
python create-elevenlabs-agent.py create pNInz6obpgDQGcFmaJgB  # Adam - deep male
```

This will output:
```
✅ Agent created successfully!

Agent ID: abc123xyz...

Add to your .env:
ELEVENLABS_AGENT_ID=abc123xyz...
```

## Step 2: Add to .env

Add these to your `.env` file:

```bash
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=the_agent_id_from_step_1
```

## Step 3: Start the Test Server

```bash
node test-elevenlabs-call.js
```

You'll see:
```
═══════════════════════════════════════════════════════
  🎤 ElevenLabs Voice Test Server
═══════════════════════════════════════════════════════
  Port: 8000

  Configuration:
  - Agent ID: ✓
  - API Key: ✓
```

## Step 4: Update Twilio Webhook

**Option A: Local Testing with ngrok**

```bash
# In a new terminal
ngrok http 8000

# Copy the ngrok URL
```

**Option B: Deployed Server**

Use your Railway/production URL.

**Set Twilio Webhook:**

1. Go to https://console.twilio.com/
2. Phone Numbers → Your Number → Configure
3. Set **Voice & Fax** → **A CALL COMES IN** → **Webhook**:
   ```
   https://your-domain.com/elevenlabs/call/incoming
   ```
4. Method: **POST**
5. Save!

## Step 5: Call Your Number! 📞

**That's it!** Call your Twilio number and hear those amazing ElevenLabs voices!

---

## Popular Voices to Try

Want to change the voice? Create a new agent with a different voice ID:

```bash
# Warm female voices
python create-elevenlabs-agent.py create 21m00Tcm4TlvDq8ikWAM  # Rachel
python create-elevenlabs-agent.py create EXAVITQu4vr4xnSDxMaL  # Bella

# Professional male voices
python create-elevenlabs-agent.py create pNInz6obpgDQGcFmaJgB  # Adam
python create-elevenlabs-agent.py create ErXwobaYiN019PkySvjV  # Antoni

# Energetic
python create-elevenlabs-agent.py create jsCqWAovK2LkecY7zXl4  # Freya
```

Find more at: https://elevenlabs.io/voice-library

---

## Custom Prompts

Want to customize what the agent says? Edit `create-elevenlabs-agent.py` and change the `prompt` parameter:

```python
create_agent(
    name="My Custom Agent",
    voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel
    prompt="""You are a helpful life coach on a phone call.

Be encouraging and supportive. Ask thoughtful questions.
Keep responses brief since this is a voice call.

Help the user reflect on their goals and challenges."""
)
```

---

## How It Works

1. **Python script** → Creates agent via ElevenLabs API
2. **Node.js server** → Bridges Twilio WebSocket ↔ ElevenLabs WebSocket
3. **Phone call** → Twilio → Your server → ElevenLabs → Beautiful voice!

No dashboard. No manual clicking. Pure code. 🎯

---

## Troubleshooting

### "Agent ID not set"
Run the Python script to create an agent, then add the ID to `.env`

### "Connection failed"
Check that your API key is correct and active

### "No audio"
- Verify Twilio webhook is set correctly
- Check server logs for errors
- Make sure ngrok is running (if local)

### "Voice sounds robotic"
You're probably still using OpenAI - make sure Twilio webhook points to the ElevenLabs endpoint!

---

## Cost

**ElevenLabs**: ~$0.08-0.12/min
**First 15 minutes**: FREE!

Test it risk-free! 🎉

---

## Compare to OpenAI

Want to compare? Keep your existing OpenAI setup and just change the Twilio webhook URL:

- **OpenAI**: `https://your-domain.com/assistant/webhooks/voice/incoming`
- **ElevenLabs**: `https://your-domain.com/elevenlabs/call/incoming`

Call and hear the difference! 🎤✨

---

## Next Steps

Once you love it (you will!), you can:

1. **Add user context**: Pass dynamic variables to personalize each call
2. **Add function calling**: Use webhook tools to track tasks/habits/goals
3. **Switch permanently**: Update your main server to use ElevenLabs

But for now - **just call and enjoy those voices!** 📞🎉
