#!/usr/bin/env node

/**
 * Test all 7 Realtime API function tools with real Supabase calls
 */

require('dotenv').config({ path: './server/assistant/.env' });
const User = require('./server/assistant/models/User');
const aiService = require('./server/assistant/services/aiService');

async function testFunctionTools() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING ALL 7 REALTIME API FUNCTION TOOLS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Find Marco's user
    const user = await User.findByPhone('+15038496848');
    if (!user) {
      console.error('❌ User not found. Run setup-marco-real-data.js first.');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name}\n`);

    const tests = [];

    // Test 1: create_task
    console.log('1️⃣  Testing create_task...');
    const createTaskResult = await aiService.executeFunctionCall('create_task', {
      title: 'Test task from function tool',
      priority: 'medium',
      category: 'personal',
      dueDate: new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour from now
    }, user.id);
    console.log(`   Result: ${createTaskResult.type}`);
    if (createTaskResult.type === 'task_created') {
      console.log(`   ✅ Task created: ${createTaskResult.data.title}`);
      tests.push({ name: 'create_task', passed: true });
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(createTaskResult)}`);
      tests.push({ name: 'create_task', passed: false });
    }

    // Test 2: complete_task
    if (createTaskResult.type === 'task_created') {
      console.log('\n2️⃣  Testing complete_task...');
      const completeTaskResult = await aiService.executeFunctionCall('complete_task', {
        taskId: createTaskResult.data.id
      }, user.id);
      console.log(`   Result: ${completeTaskResult.type}`);
      if (completeTaskResult.type === 'task_completed') {
        console.log(`   ✅ Task completed: ${completeTaskResult.data.title}`);
        tests.push({ name: 'complete_task', passed: true });
      } else {
        console.log(`   ❌ Failed: ${JSON.stringify(completeTaskResult)}`);
        tests.push({ name: 'complete_task', passed: false });
      }
    }

    // Test 3: reschedule_task (create new task first)
    console.log('\n3️⃣  Testing reschedule_task...');
    const taskForReschedule = await aiService.executeFunctionCall('create_task', {
      title: 'Task to reschedule',
      priority: 'low',
      category: 'personal',
      dueDate: new Date(Date.now() + 1000 * 60 * 60).toISOString()
    }, user.id);

    if (taskForReschedule.type === 'task_created') {
      const rescheduleResult = await aiService.executeFunctionCall('reschedule_task', {
        taskId: taskForReschedule.data.id,
        newDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // Tomorrow
      }, user.id);
      console.log(`   Result: ${rescheduleResult.type}`);
      if (rescheduleResult.type === 'task_rescheduled') {
        console.log(`   ✅ Task rescheduled`);
        tests.push({ name: 'reschedule_task', passed: true });
      } else {
        console.log(`   ❌ Failed: ${JSON.stringify(rescheduleResult)}`);
        tests.push({ name: 'reschedule_task', passed: false });
      }
    }

    // Test 4: log_habit
    console.log('\n4️⃣  Testing log_habit...');
    const logHabitResult = await aiService.executeFunctionCall('log_habit', {
      habitName: 'Test habit',
      value: null,
      notes: 'Logged from function tool test'
    }, user.id);
    console.log(`   Result: ${logHabitResult.type}`);
    if (logHabitResult.type === 'habit_logged' || logHabitResult.type === 'habit_created_and_logged') {
      console.log(`   ✅ Habit logged`);
      tests.push({ name: 'log_habit', passed: true });
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(logHabitResult)}`);
      tests.push({ name: 'log_habit', passed: false });
    }

    // Test 5: create_goal
    console.log('\n5️⃣  Testing create_goal...');
    const createGoalResult = await aiService.executeFunctionCall('create_goal', {
      title: 'Test goal from function tool',
      category: 'personal',
      timeframe: 'monthly',
      targetValue: 100,
      unit: 'percent'
    }, user.id);
    console.log(`   Result: ${createGoalResult.type}`);
    if (createGoalResult.type === 'goal_created') {
      console.log(`   ✅ Goal created: ${createGoalResult.data.title}`);
      tests.push({ name: 'create_goal', passed: true });
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(createGoalResult)}`);
      tests.push({ name: 'create_goal', passed: false });
    }

    // Test 6: update_daily_metrics
    console.log('\n6️⃣  Testing update_daily_metrics...');
    const updateMetricsResult = await aiService.executeFunctionCall('update_daily_metrics', {
      sleepQuality: 8,
      mood: 'good',
      energy: 7,
      exerciseMinutes: 45
    }, user.id);
    console.log(`   Result: ${updateMetricsResult.type}`);
    if (updateMetricsResult.type === 'metrics_updated') {
      console.log(`   ✅ Daily metrics updated`);
      tests.push({ name: 'update_daily_metrics', passed: true });
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(updateMetricsResult)}`);
      tests.push({ name: 'update_daily_metrics', passed: false });
    }

    // Test 7: update_user_profile
    console.log('\n7️⃣  Testing update_user_profile...');
    const updateProfileResult = await aiService.executeFunctionCall('update_user_profile', {
      aiContext: {
        learningData: {
          interests: ['testing', 'automation'],
          values: ['quality', 'reliability']
        }
      }
    }, user.id);
    console.log(`   Result: ${updateProfileResult.type}`);
    if (updateProfileResult.type === 'profile_updated') {
      console.log(`   ✅ User profile updated`);
      tests.push({ name: 'update_user_profile', passed: true });
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(updateProfileResult)}`);
      tests.push({ name: 'update_user_profile', passed: false });
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;
    console.log(`\nPassed: ${passed}/${total}`);
    tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
    });

    if (passed === total) {
      console.log('\n🎉 ALL FUNCTION TOOLS WORKING!');
    } else {
      console.log('\n⚠️  Some tests failed. Review errors above.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testFunctionTools();
