# ElevenLabs + Twilio Integration Guide

## Audio Format Requirements

### Twilio → ElevenLabs (Input Audio)
- **Format**: μ-law (8-bit)
- **Sample Rate**: 8,000 Hz
- **Encoding**: Base64
- **Agent Config**: `user_input_audio_format: "ulaw_8000"`

### ElevenLabs → Twilio (Output Audio)
- **Format**: μ-law (8-bit)
- **Sample Rate**: 8,000 Hz
- **Encoding**: Base64
- **Agent Config**: `output_format: "ulaw_8000"`

## Current Agent Configuration

Located in `create-elevenlabs-agent.py`:

```python
"conversation_config": {
    "tts": {
        "voice_id": voice_id,
        "model_id": "eleven_turbo_v2",
        "output_format": "ulaw_8000",  # For Twilio compatibility
        "optimize_streaming_latency": 3,
        "stability": 0.5,
        "similarity_boost": 0.75
    },
    "asr": {
        "quality": "high",
        "user_input_audio_format": "ulaw_8000"  # Twilio input format
    }
}
```

## Audio Flow

```
[Caller]
   ↓ (μ-law 8kHz audio)
[Twilio]
   ↓ (WebSocket: base64-encoded μ-law)
[elevenlabs-twilio-bridge.js]
   ↓ {user_audio_chunk: "<base64>"}
[ElevenLabs Agent]
   ↓ (transcription + LLM + TTS)
[ElevenLabs Agent]
   ↓ {audio_event: {audio_base_64: "<base64 μ-law>"}}
[elevenlabs-twilio-bridge.js]
   ↓ (WebSocket: Twilio media format)
[Twilio]
   ↓ (μ-law 8kHz audio)
[Caller]
```

## Implementation Details

### WebSocket Message Format

**Sending Audio to ElevenLabs:**
```javascript
{
  "user_audio_chunk": Buffer.from(msg.media.payload, 'base64').toString('base64')
}
```

**Receiving Audio from ElevenLabs:**
```javascript
{
  "type": "audio",
  "audio_event": {
    "audio_base_64": "<base64_encoded_audio>"
  }
}
```

**Sending Audio to Twilio:**
```javascript
{
  "event": "media",
  "streamSid": streamSid,
  "media": {
    "payload": audio_base_64
  }
}
```

## Common Issues

### Empty User Transcript

**Symptoms:**
- ElevenLabs receives audio
- Agent responds with audio
- User transcript shows as empty (`User: ...`)
- Agent says "Are you still there?"

**Possible Causes:**
1. Agent not configured with correct `user_input_audio_format`
2. Audio chunks too small/large
3. Caller not actually speaking
4. ASR (speech recognition) not processing audio correctly

**Solution:**
Recreate agent with current configuration to ensure `user_input_audio_format: "ulaw_8000"` is set.

## References

- [ElevenLabs Conversational AI Docs](https://elevenlabs.io/docs/conversational-ai)
- [Twilio Media Streams Docs](https://www.twilio.com/docs/voice/twiml/stream)
- [Reference Implementation: nibodev/elevenlabs-twilio-i-o](https://github.com/nibodev/elevenlabs-twilio-i-o)
