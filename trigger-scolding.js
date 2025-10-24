#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const twilioService = require('./server/assistant/services/twilioService');

async function triggerScoldingCall(topic = 'laundry', userName = 'marco') {
  try {
    console.log(`🔍 Looking for user named ${userName}...`);

    const users = await User.findAll();
    const user = users.find(u => u.name && u.name.toLowerCase().includes(userName.toLowerCase()));

    if (!user) {
      console.error(`❌ No user found with name containing "${userName}"`);
      console.log('Available users:', users.map(u => ({ id: u.id, name: u.name, phone: u.phone })));
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.phone})`);
    console.log(`😠 Initiating ${topic.toUpperCase()} scolding call to ${user.name}...`);

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/custom-scolding?userId=${user.id}&mode=scolding:${topic}`;

    await twilioService.makeCall(user.phone, webhookUrl);

    console.log('✅ Scolding call initiated!');
    console.log(`📱 ${user.name} is about to get yelled at about ${topic}...`);
    console.log('\nLuna will be DISAPPOINTED and FRUSTRATED! 😤');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Parse command line arguments
const topic = process.argv[2] || 'laundry';
const userName = process.argv[3] || 'marco';

console.log('\n🔥 ANGRY LUNA CALL TRIGGER 🔥\n');

// Show available topics
const availableTopics = [
  'laundry - Missing laundry 3x this month',
  'gym - Skipped gym 4x this week',
  'junk-food - Eating junk food every day',
  'sleep - Staying up past 2am for 5 nights',
  'procrastination - Putting off tasks all week'
];

console.log('Available scolding topics:');
availableTopics.forEach(t => console.log(`  • ${t}`));
console.log('\nUsage: node trigger-scolding.js [topic] [username]');
console.log('Example: node trigger-scolding.js gym marco\n');

console.log(`Selected topic: ${topic}`);
console.log(`Target user: ${userName}\n`);

triggerScoldingCall(topic, userName);
