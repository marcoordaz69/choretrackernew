/**
 * Quick Test: ElevenLabs Voice Calls
 *
 * Just run this to test ElevenLabs voices with your Twilio number!
 * No dashboard setup needed - all via API.
 */

require('dotenv').config();
const express = require('express');
const expressWs = require('express-ws');
const { setupElevenLabsRoutes } = require('./server/assistant/elevenlabs-twilio-bridge');

const app = express();
expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup ElevenLabs routes
setupElevenLabsRoutes(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ElevenLabs Test' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🎤 ElevenLabs Voice Test Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Port: ${PORT}`);
  console.log('');
  console.log('  Configuration:');
  console.log(`  - Agent ID: ${process.env.ELEVENLABS_AGENT_ID || '❌ NOT SET'}`);
  console.log(`  - API Key: ${process.env.ELEVENLABS_API_KEY ? '✓' : '❌ NOT SET'}`);
  console.log('');
  console.log('  📝 Setup Instructions:');
  console.log('  1. Create an agent (or use existing):');
  console.log('     https://elevenlabs.io/app/conversational-ai');
  console.log('');
  console.log('  2. Add to .env:');
  console.log('     ELEVENLABS_AGENT_ID=your_agent_id');
  console.log('     ELEVENLABS_API_KEY=your_api_key');
  console.log('');
  console.log('  3. Set Twilio webhook to:');
  console.log(`     https://your-domain.com/elevenlabs/call/incoming`);
  console.log('');
  console.log('  4. Call your Twilio number! 📞');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
