#!/usr/bin/env node
/**
 * Test script to verify voice service -> Claude orchestrator integration
 * Simulates what happens when a voice call completes and triggers analysis
 */

const path = require('path');

// Load environment variables from main project .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Also load orchestrator .env (for ES module imports)
require('dotenv').config({
  path: path.join(__dirname, '../.worktrees/claude-sdk-orchestration/server/claude-orchestrator/.env'),
  override: false  // Don't override existing env vars
});

const voiceService = require('./assistant/services/voiceService');

// Test UUID from orchestrator test scripts
const TEST_USER_ID = '5899f756-7e21-4ef2-a6f6-9b13e43efba5';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Testing Voice → Claude Orchestrator Integration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Simulate a MongoDB interaction object (what gets created in voiceService.js)
const mockInteraction = {
  id: 'test-interaction-' + Date.now(),
  _id: { toString: () => 'test-interaction-' + Date.now() },
  userId: TEST_USER_ID,
  type: 'voice_inbound',
  content: {
    transcript: `User: Hey Luna, I've been struggling to stay consistent with my morning routine. I keep hitting snooze.
Assistant: I understand that can be tough. What time are you trying to wake up?
User: 6 AM, but I usually end up getting up at 7:30.
Assistant: That's a 90-minute gap. What would help you get up at 6?
User: Maybe if I put my phone across the room so I have to physically get up to turn off the alarm.
Assistant: That's a solid strategy. Would you like me to check in with you tomorrow morning to see how it goes?
User: Yeah, that would be helpful. Maybe around 6:15 AM?
Assistant: Perfect, I'll call you at 6:15 AM tomorrow for a quick check-in.`
  },
  metadata: {
    duration: 120,
    twilioSid: 'test-call-sid'
  },
  timestamp: new Date()
};

console.log('📞 Simulating call completion...');
console.log('   User ID:', mockInteraction.userId);
console.log('   Call Type:', mockInteraction.type);
console.log('   Transcript Length:', mockInteraction.content.transcript.length, 'chars');
console.log('   Duration:', mockInteraction.metadata.duration, 'seconds\n');

console.log('🚀 Triggering Claude SDK analysis...\n');

// Call the integration method (same as what happens in ws.on('close'))
voiceService.triggerClaudeSDKAnalysis(mockInteraction)
  .then(result => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Integration Test PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Result:', result);
    console.log('\nThe orchestrator should have:');
    console.log('  1. Analyzed the transcript');
    console.log('  2. Detected the commitment to wake up at 6 AM');
    console.log('  3. Scheduled a motivational-wakeup call for 6:15 AM tomorrow');
    console.log('  4. Updated user insights about sleep/routine struggles\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Integration Test FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  });
