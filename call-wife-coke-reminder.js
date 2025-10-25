#!/usr/bin/env node
require('dotenv').config();

const twilioService = require('./server/assistant/services/twilioService');

async function callWifeForCoke() {
  try {
    console.log('\n🎩 Initiating butler call to Lady of the House...\n');

    const wifePhone = '+15034495581';
    const domain = process.env.DOMAIN || 'https://choretrackernew-production.up.railway.app';

    // Create webhook URL with custom mode for butler message
    const webhookUrl = `${domain}/assistant/voice/custom-butler-call`;

    console.log(`📞 Calling: ${wifePhone}`);
    console.log(`🔗 Webhook: ${webhookUrl}`);
    console.log('');

    await twilioService.makeCall(wifePhone, webhookUrl);

    console.log('✅ Call initiated! Your butler Luna is delivering the message.\n');

  } catch (error) {
    console.error('❌ Error making call:', error.message);
    console.error(error);
  }
}

callWifeForCoke();
