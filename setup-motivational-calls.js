#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');

async function setupMotivationalCalls(userName = 'marco') {
  try {
    console.log('\n🌅 MOTIVATIONAL WAKE-UP CALL SETUP\n');
    console.log(`Looking for user: ${userName}...`);

    const users = await User.findAll();
    const user = users.find(u => u.name && u.name.toLowerCase().includes(userName.toLowerCase()));

    if (!user) {
      console.error(`❌ No user found with name containing "${userName}"`);
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.phone})\n`);

    // Calculate next Saturday (tomorrow if today is Friday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate days until Saturday
    let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    if (daysUntilSaturday === 0) daysUntilSaturday = 7; // If today is Saturday, next Saturday

    const nextSaturday = new Date(now);
    nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);
    const nextSaturdayDate = nextSaturday.toISOString().split('T')[0];

    console.log('Setting up motivational wake-up calls:');
    console.log('  ⏰ Time: 6:30 PM (18:30)');
    console.log('  📅 Days: Sunday, Monday, Tuesday');
    console.log(`  📅 Bi-weekly Saturdays starting: ${nextSaturdayDate}`);
    console.log();

    // Update user preferences
    if (!user.preferences) {
      user.preferences = {};
    }

    user.preferences.motivationalWakeupEnabled = true;
    user.preferences.motivationalWakeupTime = '18:30';
    user.preferences.motivationalWakeupDays = ['sunday', 'monday', 'tuesday'];
    user.preferences.motivationalWakeupBiweeklySaturday = true;
    user.preferences.motivationalWakeupNextSaturday = nextSaturdayDate;

    await user.save();

    console.log('✅ Schedule configured successfully!\n');
    console.log('📋 Current Schedule:');
    console.log('  • Sunday at 6:30 PM');
    console.log('  • Monday at 6:30 PM');
    console.log('  • Tuesday at 6:30 PM');
    console.log(`  • Saturday ${nextSaturdayDate} at 6:30 PM`);
    console.log('  • Then every other Saturday after that\n');

    console.log('💪 Luna will call with motivational energy to:');
    console.log('  • Remind you of your WHY');
    console.log('  • Connect you to your goals');
    console.log('  • Celebrate how far you\'ve come');
    console.log('  • Inspire you for the day ahead\n');

    console.log('To test immediately, run:');
    console.log('  node test-motivational-call.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

const userName = process.argv[2] || 'marco';
setupMotivationalCalls(userName);
