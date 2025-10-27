#!/usr/bin/env node

/**
 * Check Supabase database and apply migrations if needed
 */

require('dotenv').config({ path: './server/assistant/.env' });
const { supabase } = require('./server/assistant/config/supabase');
const fs = require('fs');
const path = require('path');

async function checkAndSetupDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 CHECKING SUPABASE DATABASE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if tables exist
    console.log('📋 Checking for existing tables...');
    const requiredTables = [
      'assistant_users',
      'tasks',
      'habits',
      'goals',
      'daily_checkins',
      'interactions',
      'habit_logs',
      'goal_milestones'
    ];

    const tableChecks = [];
    for (const tableName of requiredTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          console.log(`   ❌ ${tableName} - NOT FOUND`);
          tableChecks.push({ table: tableName, exists: false });
        } else {
          console.log(`   ⚠️  ${tableName} - Error: ${error.message}`);
          tableChecks.push({ table: tableName, exists: false, error: error.message });
        }
      } else {
        console.log(`   ✅ ${tableName} - EXISTS`);
        tableChecks.push({ table: tableName, exists: true });
      }
    }

    const missingTables = tableChecks.filter(t => !t.exists);

    if (missingTables.length > 0) {
      console.log(`\n⚠️  ${missingTables.length} table(s) missing!`);
      console.log('\n📝 TO FIX THIS:');
      console.log('1. Go to https://app.supabase.com/');
      console.log('2. Select your project: jimuzwrgqaurctkeocag');
      console.log('3. Go to SQL Editor');
      console.log('4. Run this migration file:');
      console.log('   server/assistant/migrations/001_create_tables_fixed.sql\n');

      console.log('Missing tables:');
      missingTables.forEach(t => console.log(`   - ${t.table}`));

      return false;
    } else {
      console.log('\n✅ ALL TABLES EXIST!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;
    }

  } catch (error) {
    console.error('\n❌ Database check failed:');
    console.error(error);
    return false;
  }
}

checkAndSetupDatabase().then(success => {
  if (success) {
    console.log('🎉 Database is ready!');
    console.log('\nNext step: Test function tools with:');
    console.log('   node test-function-tools.js\n');
  } else {
    console.log('\n⚠️  Database setup needed. See instructions above.');
    process.exit(1);
  }
});
