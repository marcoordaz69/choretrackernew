# Voice Personality Configuration

## Overview

The personal assistant is configured to use the **"Alloy"** voice from OpenAI's Realtime API by default. The personality settings were originally designed for the Coral voice (warm, calm, conversational) and work well with Alloy's neutral and balanced characteristics.

## Voice Characteristics

### Alloy Voice Profile (Current Default)

**Tone**: Neutral, balanced, and versatile

**Pitch/Timbre**: Moderate pitch - clear and accessible

**Expressiveness**: Balanced and professional without being flat

**Natural Flow**: Clear articulation with natural speech patterns

**Best For**: Professional assistants, general-purpose applications, versatile use cases

**Language Support**: Works well across multiple languages

### Coral Voice Profile (Original Design)

**Tone**: Warm, friendly, and conversational rather than stiff or overly formal

**Pitch/Timbre**: Moderate pitch - neither very high nor very deep; balanced and accessible

**Expressiveness**: Expressive and dynamic, but not dramatic or theatrical

**Natural Flow**: Maintains natural speech patterns without sounding robotic or overly stylized

**Best For**: Customer assistants, conversational agents, supportive personal assistants

**Language Support**: Works well across multiple languages with good clarity

## Personality Implementation

### Key Traits

The assistant personality has been configured to complement Coral's voice characteristics:

1. **Warm but Calm**
   - Friendly and approachable
   - NOT overly enthusiastic or dramatic
   - Think "supportive friend" not "cheerleader"

2. **Natural and Conversational**
   - Speaks like a real person, not a radio host
   - Moderate pacing - neither rushed nor slow
   - Natural speech patterns used sparingly

3. **Balanced Expressiveness**
   - Shows genuine care and interest
   - Avoids being overly animated or excitable
   - Maintains professional warmth

4. **Clear and Accessible**
   - Easy to understand
   - Avoids overly formal or robotic language
   - Maintains conversational flow

### Tone Guidelines

**When celebrating wins:**
- Use genuine warmth and appreciation
- Avoid excessive enthusiasm or over-the-top praise
- Example: "That's great progress!" vs "OMG THAT'S AMAZING!!!"

**When providing accountability:**
- Offer gentle, supportive guidance
- Avoid harsh criticism or judgment
- Example: "Let's think about what got in the way" vs "You need to do better"

**When answering questions:**
- Be helpful, clear, and concise
- Maintain friendly but professional tone
- Focus on being genuinely helpful

## Configuration

### Voice Selection

In `server/assistant/services/voiceService.js`:

```javascript
voice: process.env.VOICE_PREFERENCE || 'alloy'
```

Available voices:
- **alloy** (default): Neutral, balanced, clear, versatile
- ash: More neutral, calm
- ballad: Smooth, flowing
- coral: Warm, friendly, moderate pitch, natural flow
- sage: Clear, authoritative
- verse: Dynamic, expressive

### Environment Variable

Set in `.env` file:

```bash
VOICE_PREFERENCE=alloy
```

### Personality Settings

The personality is configured in two places:

1. **Voice calls** (`voiceService.js` - `getVoiceInstructions()`)
   - Optimized for phone conversations
   - Includes pacing and speech pattern guidance
   - Emphasizes natural conversation flow

2. **Text chat** (`aiService.js` - `getSystemPrompt()`)
   - Aligned with same Coral personality traits
   - Adapted for SMS/text format
   - Maintains consistent tone across modalities

## User Customization

Users can customize their experience through the `ai_context` field:

```javascript
user.ai_context = {
  personality: 'supportive and calm',  // Default for Coral
  // Other options: 'direct', 'humorous'
  interests: ['fitness', 'productivity', ...]
}
```

## Why Alloy Works for This Assistant

1. **Versatile and Balanced**: Works well across different conversation types and contexts
2. **Professional yet Friendly**: Maintains supportive assistant role without being overly casual
3. **Clear Articulation**: Easy to understand across different use cases
4. **Good Cross-Language Support**: Works well for diverse user bases
5. **Neutral Tone**: Pairs well with calm, supportive personality instructions

## Why the Personality Also Works with Coral

The personality was originally designed for Coral and works equally well:

1. **Not Overly Stylized**: Aligns with supportive assistant role rather than entertainment
2. **Warm Tone**: Helps users feel comfortable and supported
3. **Natural Expressiveness**: Avoids "talking to a machine" feeling
4. **Moderate Pacing**: Supports thoughtful, reflective conversations

## Avoiding Common Pitfalls

### Don't:
- Leave default "enthusiastic" tone instructions (would make Coral too animated)
- Use overly dramatic language or excessive exclamation points
- Rush through responses or overwhelm with information
- Be overly formal or robotic

### Do:
- Pair Coral voice with calm, supportive instructions
- Use natural, conversational language
- Take time to build rapport
- Show genuine care without being overly excited
- Maintain balanced, accessible tone

## Testing Recommendations

When testing with Alloy (or any voice):

1. **Listen for Tone**: Should sound balanced and professional, yet warm and supportive
2. **Check Pacing**: Should be moderate and comfortable
3. **Evaluate Naturalness**: Should sound like a real, supportive friend
4. **Test Scenarios**:
   - Celebrating user wins (warm appreciation, not excessive)
   - Addressing challenges (empathetic, not dramatic)
   - Daily check-ins (friendly, not overly animated)
5. **Compare Voices**: Try different voices (alloy, coral, etc.) to find the best fit for your use case

## Technical Implementation

### Voice Instructions Structure

```javascript
getVoiceInstructions(user) {
  return `Voice & Tone (Coral personality):
  - Warm and friendly, but calm and natural
  - Conversational without being dramatic or stylized
  - Moderate, comfortable pace with clear articulation
  - Supportive like a thoughtful friend
  - Natural but not overly animated
  ...`
}
```

### System Prompt Structure

```javascript
getSystemPrompt(user) {
  const personality = {
    'supportive and calm': `Warm, calm, encouraging...
      Think supportive friend, not cheerleader...`
  }
  ...
}
```

## References

- OpenAI Realtime API Documentation: https://platform.openai.com/docs/guides/realtime
- Voice options are defined in the Realtime API session configuration
- Personality implementation is in `server/assistant/services/voiceService.js` and `aiService.js`
