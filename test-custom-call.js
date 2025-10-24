#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const twilioService = require('./server/assistant/services/twilioService');

async function testCustomCall() {
  try {
    console.log('🔍 Looking for user named Marco...');

    // Find Marco in the database
    const users = await User.findAll();
    const marco = users.find(u => u.name && u.name.toLowerCase().includes('marco'));

    if (!marco) {
      console.error('❌ No user found with name containing "Marco"');
      return;
    }

    console.log(`✅ Found user: ${marco.name} (${marco.phone})`);
    console.log(`😠 Initiating SCOLDING call to ${marco.name}...`);

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/custom-scolding?userId=${marco.id}`;

    await twilioService.makeCall(marco.phone, webhookUrl);

    console.log('✅ Scolding call initiated!');
    console.log('📱 Prepare to be yelled at...');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testCustomCall();
