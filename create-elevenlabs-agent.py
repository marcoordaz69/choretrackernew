#!/usr/bin/env python3
"""
Create ElevenLabs Agent Programmatically

Run this to create a new agent with your custom voice/prompt via API!
No dashboard needed.

Usage:
    python create-elevenlabs-agent.py
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')

def create_agent(name="Personal Assistant", voice_id="21m00Tcm4TlvDq8ikWAM", prompt=None):
    """
    Create a new ElevenLabs Conversational AI agent

    Args:
        name: Agent name
        voice_id: ElevenLabs voice ID (default: Rachel - natural female voice)
        prompt: Custom system prompt

    Popular Voice IDs:
        - 21m00Tcm4TlvDq8ikWAM: Rachel (natural, warm female)
        - pNInz6obpgDQGcFmaJgB: Adam (deep, professional male)
        - EXAVITQu4vr4xnSDxMaL: Bella (soft, conversational female)
        - ErXwobaYiN019PkySvjV: Antoni (calm, friendly male)

    Find more at: https://elevenlabs.io/voice-library
    """

    if not ELEVENLABS_API_KEY:
        print("❌ Error: ELEVENLABS_API_KEY not set in .env")
        return None

    if prompt is None:
        prompt = """You are a friendly personal assistant on a phone call.

Be warm, conversational, and helpful. Keep responses concise since this is a phone call.

Listen carefully to what the user says and respond naturally. Be supportive and encouraging."""

    url = "https://api.elevenlabs.io/v1/convai/agents/create"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }

    # Agent configuration
    payload = {
        "conversation_config": {
            "agent": {
                "prompt": {
                    "prompt": prompt,
                    "llm": "gpt-4o-mini",  # Fast and cheap
                    "temperature": 0.7
                },
                "first_message": "Hey! How can I help you today?",
                "language": "en"
            },
            "tts": {
                "voice_id": voice_id,
                "model_id": "eleven_turbo_v2",  # Fast, high-quality
                "optimize_streaming_latency": 3,  # Lower latency
                "stability": 0.5,
                "similarity_boost": 0.75
            },
            "asr": {
                "quality": "high",
                "user_input_audio_format": "ulaw_8000"  # Twilio uses μ-law 8kHz
            }
        },
        "platform_settings": {
            "widget": {
                "color_1": "#3B82F6",
                "color_2": "#60A5FA"
            }
        },
        "name": name
    }

    print(f"🤖 Creating agent: {name}")
    print(f"🎤 Voice ID: {voice_id}")
    print(f"📝 Prompt: {prompt[:100]}...")
    print("")
    print("⏳ Creating agent...")

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        data = response.json()
        agent_id = data['agent_id']

        print("")
        print("✅ Agent created successfully!")
        print("")
        print("═══════════════════════════════════════════════════════")
        print(f"  Agent ID: {agent_id}")
        print("═══════════════════════════════════════════════════════")
        print("")
        print("📝 Next steps:")
        print("")
        print(f"1. Add to your .env file:")
        print(f"   ELEVENLABS_AGENT_ID={agent_id}")
        print("")
        print("2. Start the test server:")
        print("   node test-elevenlabs-call.js")
        print("")
        print("3. Update Twilio webhook to:")
        print("   https://your-domain.com/elevenlabs/call/incoming")
        print("")
        print("4. Call your Twilio number! 📞")
        print("")

        return agent_id
    else:
        print(f"❌ Error creating agent: {response.status_code}")
        print(response.text)
        return None


def list_voices():
    """List available ElevenLabs voices"""

    if not ELEVENLABS_API_KEY:
        print("❌ Error: ELEVENLABS_API_KEY not set")
        return

    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": ELEVENLABS_API_KEY}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("")
        print("🎤 Available Voices:")
        print("═══════════════════════════════════════════════════════")

        for voice in data['voices'][:20]:  # Show first 20
            print(f"  {voice['name']:<20} ID: {voice['voice_id']}")
            if 'labels' in voice:
                labels = ', '.join([f"{k}: {v}" for k, v in voice['labels'].items()])
                print(f"  {'':20} ({labels})")
            print("")
    else:
        print(f"❌ Error fetching voices: {response.status_code}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "list-voices":
            list_voices()
        elif sys.argv[1] == "create":
            # Custom creation
            voice_id = sys.argv[2] if len(sys.argv) > 2 else "21m00Tcm4TlvDq8ikWAM"
            create_agent(voice_id=voice_id)
        else:
            print("Usage:")
            print("  python create-elevenlabs-agent.py              # Create with default voice")
            print("  python create-elevenlabs-agent.py list-voices  # List available voices")
            print("  python create-elevenlabs-agent.py create <voice_id>  # Create with specific voice")
    else:
        # Default: create with default settings
        create_agent()
