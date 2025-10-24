#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const twilioService = require('./server/assistant/services/twilioService');

async function testMotivationalCall(userName = 'marco') {
  try {
    console.log('\n🌅 MOTIVATIONAL WAKE-UP CALL TEST\n');
    console.log(`🔍 Looking for user: ${userName}...`);

    const users = await User.findAll();
    const user = users.find(u => u.name && u.name.toLowerCase().includes(userName.toLowerCase()));

    if (!user) {
      console.error(`❌ No user found with name containing "${userName}"`);
      console.log('Available users:', users.map(u => ({ id: u.id, name: u.name, phone: u.phone })));
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.phone})`);
    console.log(`\n💪 Initiating MOTIVATIONAL wake-up call to ${user.name}...\n`);

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/motivational-wakeup?userId=${user.id}`;

    await twilioService.makeCall(user.phone, webhookUrl);

    console.log('✅ Motivational call initiated!\n');
    console.log('📱 Your phone should ring shortly...\n');
    console.log('🎯 Luna will call with ENERGY and INSPIRATION to:');
    console.log('  • Remind you of your WHY');
    console.log('  • Connect you to your goals');
    console.log('  • Celebrate your journey');
    console.log('  • Energize you for the day ahead\n');
    console.log('Rise and shine! 🌅\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

const userName = process.argv[2] || 'marco';
testMotivationalCall(userName);
