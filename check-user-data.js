#!/usr/bin/env node

/**
 * Check for existing user data in Supabase
 */

require('dotenv').config({ path: './server/assistant/.env' });
const User = require('./server/assistant/models/User');

async function checkUserData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 CHECKING FOR USERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check for Marco's user
    const marco = await User.findByPhone('+15038496848');

    if (marco) {
      console.log('✅ Found user: Marco');
      console.log(`   Phone: ${marco.phone}`);
      console.log(`   Name: ${marco.name}`);
      console.log(`   ID: ${marco.id}`);
      console.log(`   Onboarded: ${marco.onboarded}`);
      console.log(`   Timezone: ${marco.timezone}`);
      return true;
    } else {
      console.log('❌ User not found: +15038496848');
      console.log('\n📝 TO FIX: Run setup script to create Marco\'s profile:');
      console.log('   node setup-marco-real-data.js');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Error checking user:');
    console.error(error);
    return false;
  }
}

checkUserData();
