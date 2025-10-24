#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const voiceService = require('./server/assistant/services/voiceService');

async function testOutboundCall() {
  try {
    console.log('🔍 Looking for user named Marco...');

    // Find Marco in the database
    const users = await User.findAll();
    const marco = users.find(u => u.name && u.name.toLowerCase().includes('marco'));

    if (!marco) {
      console.error('❌ No user found with name containing "Marco"');
      console.log('Available users:', users.map(u => ({ id: u.id, name: u.name, phone: u.phone })));
      return;
    }

    console.log(`✅ Found user: ${marco.name} (${marco.phone})`);
    console.log(`📞 Initiating outbound call to ${marco.name}...`);

    await voiceService.initiateReflectionCall(marco.id);

    console.log('✅ Call initiated successfully!');
    console.log('📱 Your phone should ring shortly...');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testOutboundCall();
