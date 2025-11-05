import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { choreTrackerServer } from './mcp-servers/choreTracker.js';
import { processCallCompletion } from './processors/callCompletionProcessor.js';
import readline from 'readline';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

console.log(c('bright', '\n========================================'));
console.log(c('cyan', '  Claude Orchestrator Interactive Test'));
console.log(c('bright', '========================================\n'));

// Step 1: Environment Check
console.log(c('blue', '📋 Step 1: Checking Environment Setup...'));

const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log(c('red', `✗ Missing environment variables: ${missing.join(', ')}`));
  console.log(c('yellow', '\n💡 Fix: Copy .env.example to .env and add your credentials'));
  console.log(c('yellow', '   See SETUP.md for detailed instructions\n'));
  process.exit(1);
}

console.log(c('green', '✓ All environment variables set'));

// Step 2: Database Connection Check
console.log(c('blue', '\n📋 Step 2: Testing Database Connection...'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

try {
  // Check if tables exist
  const { data: tables, error } = await supabase
    .from('user_sessions')
    .select('user_id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log(c('red', '✗ Required tables not found'));
    console.log(c('yellow', '\n💡 Fix: Apply the database migration'));
    console.log(c('yellow', '   1. Go to Supabase Dashboard > SQL Editor'));
    console.log(c('yellow', '   2. Run the migration from server/migrations/20250105_claude_sdk_tables.sql'));
    console.log(c('yellow', '   See SETUP.md for detailed instructions\n'));
    process.exit(1);
  }

  console.log(c('green', '✓ Database connection successful'));
  console.log(c('green', '✓ Required tables exist'));
} catch (error) {
  console.log(c('red', `✗ Database connection failed: ${error.message}`));
  console.log(c('yellow', '\n💡 Fix: Check your SUPABASE_URL and SUPABASE_SERVICE_KEY\n'));
  process.exit(1);
}

// Step 3: Get User ID
console.log(c('blue', '\n📋 Step 3: Looking up test user...'));

let testUserId;
try {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name')
    .limit(5);

  if (error) throw error;

  if (!users || users.length === 0) {
    console.log(c('red', '✗ No users found in database'));
    console.log(c('yellow', '\n💡 Fix: Create a user in your Supabase database first\n'));
    process.exit(1);
  }

  console.log(c('green', `\n✓ Found ${users.length} user(s):`));
  users.forEach((u, i) => {
    console.log(c('cyan', `  ${i + 1}. ${u.name} (${u.id})`));
  });

  testUserId = users[0].id;
  console.log(c('green', `\n✓ Using: ${users[0].name}`));
} catch (error) {
  console.log(c('red', `✗ Failed to fetch users: ${error.message}\n`));
  process.exit(1);
}

// Step 4: Interactive Test Menu
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function runTest() {
  console.log(c('bright', '\n========================================'));
  console.log(c('cyan', '  Test Options'));
  console.log(c('bright', '========================================'));
  console.log('1. Simulate a motivational morning call');
  console.log('2. Simulate an evening reflection call');
  console.log('3. Simulate a task completion call');
  console.log('4. Custom transcript');
  console.log('5. View scheduled calls');
  console.log('6. View user insights');
  console.log('7. Exit');

  const choice = await ask(c('yellow', '\nEnter your choice (1-7): '));

  switch (choice.trim()) {
    case '1':
      await simulateCall(
        'motivational-wakeup',
        "Morning! Yeah, I'm up. Actually feeling pretty good today. I want to hit the gym before work and maybe meal prep for the week. Let's make today count."
      );
      break;
    case '2':
      await simulateCall(
        'wind-down-reflection',
        "Today was solid. Got through my work tasks, hit the gym, and spent time with family. Feeling accomplished. Tomorrow I want to tackle that project I've been putting off."
      );
      break;
    case '3':
      await simulateCall(
        'task-reminder',
        "Hey, I actually did complete that task! Took me longer than expected but it's done. Feels good to check it off. What else do I have coming up?"
      );
      break;
    case '4':
      const customTranscript = await ask(c('yellow', 'Enter custom transcript: '));
      const callType = await ask(c('yellow', 'Enter call type (motivational-wakeup/wind-down-reflection/task-reminder/scolding/morning-briefing): '));
      await simulateCall(callType.trim() || 'wind-down-reflection', customTranscript);
      break;
    case '5':
      await viewScheduledCalls();
      break;
    case '6':
      await viewUserInsights();
      break;
    case '7':
      console.log(c('cyan', '\n👋 Goodbye!\n'));
      rl.close();
      process.exit(0);
      return;
    default:
      console.log(c('red', '✗ Invalid choice'));
  }

  await runTest();
}

async function simulateCall(callType, transcript) {
  console.log(c('bright', '\n========================================'));
  console.log(c('cyan', '  Simulating Call Completion'));
  console.log(c('bright', '========================================'));

  const mockInteraction = {
    id: `test-${Date.now()}`,
    user_id: testUserId,
    call_type: callType,
    transcript: transcript,
    created_at: new Date().toISOString()
  };

  console.log(c('yellow', '\nCall Details:'));
  console.log(c('cyan', `  Type: ${callType}`));
  console.log(c('cyan', `  Transcript: "${transcript}"`));
  console.log(c('yellow', '\n🤖 Claude is analyzing...\n'));

  try {
    const startTime = Date.now();

    await processCallCompletion(mockInteraction, {
      'chore-tracker': choreTrackerServer
    });

    const duration = Date.now() - startTime;
    console.log(c('green', `\n✓ Analysis complete (${duration}ms)`));
  } catch (error) {
    console.log(c('red', `\n✗ Analysis failed: ${error.message}`));
    if (error.stack) {
      console.log(c('red', error.stack));
    }
  }

  console.log(c('yellow', '\nPress Enter to continue...'));
  await ask('');
}

async function viewScheduledCalls() {
  console.log(c('bright', '\n========================================'));
  console.log(c('cyan', '  Scheduled Calls'));
  console.log(c('bright', '========================================\n'));

  try {
    const { data: calls, error } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('user_id', testUserId)
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!calls || calls.length === 0) {
      console.log(c('yellow', 'No scheduled calls found'));
    } else {
      calls.forEach((call, i) => {
        console.log(c('cyan', `${i + 1}. ${call.call_type}`));
        console.log(c('reset', `   Scheduled: ${new Date(call.scheduled_for).toLocaleString()}`));
        console.log(c('reset', `   Status: ${call.status}`));
        if (call.custom_instructions) {
          console.log(c('reset', `   Instructions: ${call.custom_instructions}`));
        }
        console.log('');
      });
    }
  } catch (error) {
    console.log(c('red', `✗ Failed to fetch calls: ${error.message}`));
  }

  console.log(c('yellow', '\nPress Enter to continue...'));
  await ask('');
}

async function viewUserInsights() {
  console.log(c('bright', '\n========================================'));
  console.log(c('cyan', '  User Insights'));
  console.log(c('bright', '========================================\n'));

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('insights')
      .eq('id', testUserId)
      .single();

    if (error) throw error;

    const insights = user.insights || { patterns: [], preferences: [], goals: [], behaviors: {} };

    console.log(c('cyan', 'Patterns:'));
    if (insights.patterns && insights.patterns.length > 0) {
      insights.patterns.forEach(p => console.log(c('reset', `  • ${p}`)));
    } else {
      console.log(c('yellow', '  (none yet)'));
    }

    console.log(c('cyan', '\nPreferences:'));
    if (insights.preferences && insights.preferences.length > 0) {
      insights.preferences.forEach(p => console.log(c('reset', `  • ${p}`)));
    } else {
      console.log(c('yellow', '  (none yet)'));
    }

    console.log(c('cyan', '\nGoals:'));
    if (insights.goals && insights.goals.length > 0) {
      insights.goals.forEach(g => console.log(c('reset', `  • ${g}`)));
    } else {
      console.log(c('yellow', '  (none yet)'));
    }

    console.log(c('cyan', '\nBehaviors:'));
    if (insights.behaviors && Object.keys(insights.behaviors).length > 0) {
      Object.entries(insights.behaviors).forEach(([key, value]) => {
        console.log(c('reset', `  ${key}: ${JSON.stringify(value)}`));
      });
    } else {
      console.log(c('yellow', '  (none yet)'));
    }

    if (insights.lastUpdated) {
      console.log(c('cyan', `\nLast updated: ${new Date(insights.lastUpdated).toLocaleString()}`));
    }
  } catch (error) {
    console.log(c('red', `✗ Failed to fetch insights: ${error.message}`));
  }

  console.log(c('yellow', '\nPress Enter to continue...'));
  await ask('');
}

// Start the interactive test
console.log(c('green', '\n✓ All checks passed! Ready to test.\n'));
runTest().catch(error => {
  console.error(c('red', `\n✗ Test error: ${error.message}\n`));
  rl.close();
  process.exit(1);
});
