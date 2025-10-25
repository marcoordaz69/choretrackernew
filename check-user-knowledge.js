#!/usr/bin/env node
require('dotenv').config();

const User = require('./server/assistant/models/User');
const Goal = require('./server/assistant/models/Goal');
const Task = require('./server/assistant/models/Task');
const Habit = require('./server/assistant/models/Habit');

async function checkUserKnowledge() {
  try {
    const users = await User.findAll();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     PERSONAL ASSISTANT - USER KNOWLEDGE SUMMARY          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total Users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No users found in the database.\n');
      return;
    }

    for (const user of users) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('👤 USER PROFILE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Name:           ${user.name}`);
      console.log(`Phone:          ${user.phone}`);
      console.log(`Email:          ${user.email || 'Not set'}`);
      console.log(`Timezone:       ${user.timezone}`);
      console.log(`Active:         ${user.active ? '✅ Yes' : '❌ No'}`);
      console.log(`Onboarded:      ${user.onboarded ? '✅ Yes' : '❌ No'}`);
      console.log(`Last Active:    ${user.last_active || 'Never'}`);
      console.log('');

      // Learning Data
      console.log('───────────────────────────────────────────────────────────');
      console.log('🧠 AI LEARNING DATA (What the assistant knows about you)');
      console.log('───────────────────────────────────────────────────────────');
      const learningData = user.ai_context?.learningData || {};

      if (Object.keys(learningData).length === 0) {
        console.log('⚠️  No learning data has been collected yet.\n');
      } else {
        if (learningData.interests && learningData.interests.length > 0) {
          console.log(`Interests:              ${learningData.interests.join(', ')}`);
        }
        if (learningData.challenges && learningData.challenges.length > 0) {
          console.log(`Challenges:             ${learningData.challenges.join(', ')}`);
        }
        if (learningData.values && learningData.values.length > 0) {
          console.log(`Values:                 ${learningData.values.join(', ')}`);
        }
        if (learningData.motivations && learningData.motivations.length > 0) {
          console.log(`Motivations:            ${learningData.motivations.join('; ')}`);
        }
        if (learningData.communicationStyle) {
          console.log(`Communication Style:    ${learningData.communicationStyle}`);
        }
        if (learningData.recentWins && learningData.recentWins.length > 0) {
          console.log(`\nRecent Wins:`);
          learningData.recentWins.forEach((win, i) => {
            console.log(`  ${i + 1}. ${win}`);
          });
        }
        if (learningData.customNotes) {
          console.log(`\nCustom Notes:           ${learningData.customNotes}`);
        }
        console.log('');
      }

      // Preferences
      console.log('───────────────────────────────────────────────────────────');
      console.log('⚙️  PREFERENCES & SETTINGS');
      console.log('───────────────────────────────────────────────────────────');
      if (user.preferences) {
        console.log(`Morning Check-in:       ${user.preferences.morningCheckInTime || 'Not set'}`);
        console.log(`Evening Check-in:       ${user.preferences.eveningCheckInTime || 'Not set'}`);
        console.log(`Nudge Frequency:        ${user.preferences.nudgeFrequency || 'Not set'}`);
        console.log(`Prefer Voice Calls:     ${user.preferences.preferVoice ? '✅ Yes' : '❌ No'}`);

        if (user.preferences.quietHours) {
          console.log(`Quiet Hours:            ${user.preferences.quietHours.start} - ${user.preferences.quietHours.end}`);
        }

        if (user.preferences.motivationalWakeupEnabled) {
          console.log(`\nMotivational Wake-up Calls:`);
          console.log(`  Enabled:              ✅ Yes`);
          console.log(`  Time:                 ${user.preferences.motivationalWakeupTime}`);
          console.log(`  Days:                 ${user.preferences.motivationalWakeupDays?.join(', ') || 'Not set'}`);
          if (user.preferences.motivationalWakeupBiweeklySaturday) {
            console.log(`  Bi-weekly Saturdays:  ✅ Yes`);
            console.log(`  Next Saturday:        ${user.preferences.motivationalWakeupNextSaturday || 'Not set'}`);
          }
        }

        console.log('');
      } else {
        console.log('⚠️  No preferences set.\n');
      }

      // Goals
      console.log('───────────────────────────────────────────────────────────');
      console.log('🎯 GOALS');
      console.log('───────────────────────────────────────────────────────────');
      const goals = await Goal.findByUserId(user.id);
      const activeGoals = goals.filter(g => g.status === 'active');

      if (activeGoals.length === 0) {
        console.log('⚠️  No active goals set.\n');
      } else {
        activeGoals.forEach(goal => {
          console.log(`\n📌 ${goal.title}`);
          if (goal.description) console.log(`   Description: ${goal.description}`);
          console.log(`   Category: ${goal.category}`);
          console.log(`   Timeframe: ${goal.timeframe}`);
          console.log(`   Progress: ${goal.progress}%`);
          if (goal.metric && goal.metric.current) {
            console.log(`   Metric: ${goal.metric.current}/${goal.metric.target} ${goal.metric.unit}`);
          }
        });
        console.log('');
      }

      // Habits
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔄 HABITS');
      console.log('───────────────────────────────────────────────────────────');
      const habits = await Habit.findByUserId(user.id);
      const activeHabits = habits.filter(h => h.active);

      if (activeHabits.length === 0) {
        console.log('⚠️  No active habits tracked.\n');
      } else {
        activeHabits.forEach(habit => {
          const streak = habit.streak || { current: 0, longest: 0 };
          console.log(`\n✅ ${habit.name}`);
          if (habit.description) console.log(`   Description: ${habit.description}`);
          console.log(`   Category: ${habit.category}`);
          console.log(`   Frequency: ${habit.frequency}`);
          console.log(`   Current Streak: ${streak.current || 0} days 🔥`);
          console.log(`   Longest Streak: ${streak.longest || 0} days`);
        });
        console.log('');
      }

      // Tasks
      console.log('───────────────────────────────────────────────────────────');
      console.log('📝 UPCOMING TASKS');
      console.log('───────────────────────────────────────────────────────────');
      const tasks = await Task.findPending(user.id);
      const upcomingTasks = tasks.filter(t => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        return dueDate <= threeDaysOut;
      }).slice(0, 5);

      if (upcomingTasks.length === 0) {
        console.log('⚠️  No upcoming tasks (next 3 days).\n');
      } else {
        upcomingTasks.forEach(task => {
          const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
          console.log(`\n📌 ${task.title}`);
          console.log(`   Priority: ${task.priority}`);
          console.log(`   Due: ${dueDate}`);
          console.log(`   Status: ${task.status}`);
        });
        console.log('');
      }

      // AI Personality
      console.log('───────────────────────────────────────────────────────────');
      console.log('🤖 AI PERSONALITY');
      console.log('───────────────────────────────────────────────────────────');
      const personality = user.ai_context?.personality || 'supportive';
      console.log(`Personality Mode:       ${personality}`);
      console.log('');

      // Subscription
      console.log('───────────────────────────────────────────────────────────');
      console.log('💳 SUBSCRIPTION');
      console.log('───────────────────────────────────────────────────────────');
      if (user.subscription) {
        console.log(`Tier:                   ${user.subscription.tier || 'free'}`);
        console.log(`Message Count:          ${user.subscription.messageCount || 0}`);
        console.log(`Reset Date:             ${user.subscription.resetDate || 'Not set'}`);
      }
      console.log('');
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    console.log('✅ Summary complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

checkUserKnowledge();
