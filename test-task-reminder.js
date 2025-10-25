#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const Task = require('./server/assistant/models/Task');
const twilioService = require('./server/assistant/services/twilioService');

async function testTaskReminder(userName = 'marco') {
  try {
    console.log('\n🔔 TASK REMINDER CALL TEST\n');
    console.log(`Looking for user: ${userName}...`);

    const users = await User.findAll();
    const user = users.find(u => u.name && u.name.toLowerCase().includes(userName.toLowerCase()));

    if (!user) {
      console.error(`❌ No user found with name containing "${userName}"`);
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.phone})\n`);

    // Create task due in 5 minutes
    const now = new Date();
    const fiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);

    console.log('📝 Creating task: Setup dinner');
    console.log(`   Due: ${fiveMinutes.toLocaleTimeString()}\n`);

    const task = await Task.create({
      userId: user.id,
      title: 'Setup dinner',
      category: 'personal',
      priority: 'high',
      status: 'pending',
      due_date: fiveMinutes.toISOString(),
      notes: 'Time to prepare dinner'
    });

    console.log(`✅ Task created (ID: ${task.id})\n`);

    // Trigger reminder call immediately
    console.log('📞 Initiating task reminder call...\n');

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/task-reminder?userId=${user.id}&taskId=${task.id}`;

    await twilioService.makeCall(user.phone, webhookUrl);

    console.log('✅ Task reminder call initiated!\n');
    console.log('📱 Your phone should ring shortly...\n');
    console.log('🎯 Luna will remind you about:');
    console.log('   • Setup dinner');
    console.log('   • Due in 5 minutes\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

const userName = process.argv[2] || 'marco';
testTaskReminder(userName);
