const cron = require('node-cron');
const User = require('../models/User');
const twilioService = require('./twilioService');
const aiService = require('./aiService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for orchestrator scheduled calls
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class Scheduler {
  constructor() {
    this.jobs = [];
    console.log('Scheduler initialized');
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    // Morning check-ins - runs every minute to check for users needing morning check-in
    const morningJob = cron.schedule('* * * * *', async () => {
      await this.processMorningCheckIns();
    });
    this.jobs.push(morningJob);

    // Evening check-ins - runs every minute to check for users needing evening check-in
    const eveningJob = cron.schedule('* * * * *', async () => {
      await this.processEveningCheckIns();
    });
    this.jobs.push(eveningJob);

    // Motivational wake-up calls - runs every minute to check for scheduled calls
    const motivationalJob = cron.schedule('* * * * *', async () => {
      await this.processMotivationalWakeupCalls();
    });
    this.jobs.push(motivationalJob);

    // Task reminder calls - runs every minute to check for tasks due now
    const taskReminderJob = cron.schedule('* * * * *', async () => {
      await this.processTaskReminderCalls();
    });
    this.jobs.push(taskReminderJob);
    console.log('✅ Task reminder scheduler initialized - will check for due tasks every minute');

    // Proactive nudges - runs every 30 minutes
    const nudgeJob = cron.schedule('*/30 * * * *', async () => {
      await this.processProactiveNudges();
    });
    this.jobs.push(nudgeJob);

    // Reset message counts - runs daily at midnight
    const resetJob = cron.schedule('0 0 * * *', async () => {
      await this.resetMessageCounts();
    });
    this.jobs.push(resetJob);

    // Orchestrator scheduled calls - runs every minute to check for Claude-scheduled calls
    const orchestratorCallsJob = cron.schedule('* * * * *', async () => {
      await this.processOrchestratorScheduledCalls();
    });
    this.jobs.push(orchestratorCallsJob);
    console.log('✅ Orchestrator scheduled calls processor initialized - will check Supabase every minute');

    console.log('All scheduled jobs started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('All scheduled jobs stopped');
  }

  /**
   * Process morning check-ins
   */
  async processMorningCheckIns() {
    try {
      // Find users whose morning check-in time matches current time IN THEIR TIMEZONE
      const allUsers = await User.findAll();
      const now = new Date();
      const users = allUsers.filter(user => {
        if (!user.active || !user.onboarded || !user.preferences?.morningCheckInTime) {
          return false;
        }

        // Get current time in user's timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: user.timezone || 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;
        const currentTime = `${hour}:${minute}`;

        return user.preferences.morningCheckInTime === currentTime;
      });

      if (users.length > 0) {
        const currentTime = now.toISOString();
        console.log(`Processing morning check-ins for ${users.length} users at ${currentTime}`);
      }

      for (const user of users) {
        // Quiet hours disabled
        // if (user.isInQuietHours()) {
        //   console.log(`User ${user.phone} is in quiet hours, skipping`);
        //   continue;
        // }

        // Initiate morning briefing voice call
        const domain = process.env.DOMAIN || 'https://choretrackernew-production.up.railway.app';
        const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
        const webhookUrl = `${baseUrl}/assistant/voice/morning-briefing?userId=${user.id}`;

        await twilioService.makeCall(user.phone, webhookUrl);

        console.log(`Morning briefing call initiated for ${user.name} (${user.phone})`);
      }
    } catch (error) {
      console.error('Error processing morning check-ins:', error);
    }
  }

  /**
   * Process evening check-ins
   */
  async processEveningCheckIns() {
    try {
      // Find users whose evening check-in time matches current time IN THEIR TIMEZONE
      const allUsers = await User.findAll();
      const now = new Date();
      const users = allUsers.filter(user => {
        if (!user.active || !user.onboarded || !user.preferences?.eveningCheckInTime) {
          return false;
        }

        // Get current time in user's timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: user.timezone || 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;
        const currentTime = `${hour}:${minute}`;

        return user.preferences.eveningCheckInTime === currentTime;
      });

      if (users.length > 0) {
        console.log(`Processing evening check-ins for ${users.length} users at ${now.toISOString()}`);
      }

      for (const user of users) {
        // Quiet hours disabled
        // if (user.isInQuietHours()) continue;

        // Check if user prefers voice call for evening reflection
        if (user.preferences?.eveningReflectionVoice) {
          // Make voice call for wind-down reflection
          const domain = process.env.DOMAIN || 'https://choretrackernew-production.up.railway.app';
          const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
          const webhookUrl = `${baseUrl}/assistant/voice/wind-down-reflection?userId=${user.id}`;

          await twilioService.makeCall(user.phone, webhookUrl);
          console.log(`Wind-down reflection CALL initiated for ${user.name} (${user.phone})`);
        } else {
          // Send SMS as before
          const reflection = await aiService.generateEveningReflection(user.id);
          await twilioService.sendSMS(user.phone, reflection);
          console.log(`Evening reflection SMS sent to ${user.name} (${user.phone})`);
        }
      }
    } catch (error) {
      console.error('Error processing evening check-ins:', error);
    }
  }

  /**
   * Process motivational wake-up calls
   */
  async processMotivationalWakeupCalls() {
    try {
      const voiceService = require('./voiceService');
      const now = new Date();

      // Find users whose wake-up time matches current time IN THEIR TIMEZONE
      const allUsers = await User.findAll();
      const users = allUsers.filter(user => {
        if (!user.active || !user.onboarded || !user.preferences?.motivationalWakeupEnabled) {
          return false;
        }

        // Get current time and day in user's timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: user.timezone || 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;
        const currentTime = `${hour}:${minute}`;

        return user.preferences.motivationalWakeupTime === currentTime;
      });

      for (const user of users) {
        const days = user.preferences?.motivationalWakeupDays || [];
        let shouldCall = false;

        // Get current day and date in user's timezone
        const userDate = new Date(now.toLocaleString('en-US', {
          timeZone: user.timezone || 'America/New_York'
        }));
        const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][userDate.getDay()];
        const todayDate = userDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if today is in the regular schedule
        if (days.includes(currentDay)) {
          shouldCall = true;
        }

        // Check for bi-weekly Saturday
        if (currentDay === 'saturday' && user.preferences?.motivationalWakeupBiweeklySaturday) {
          const nextSaturday = user.preferences?.motivationalWakeupNextSaturday;
          if (nextSaturday === todayDate) {
            shouldCall = true;

            // Update next Saturday to 2 weeks from now
            const twoWeeksLater = new Date(userDate);
            twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
            user.preferences.motivationalWakeupNextSaturday = twoWeeksLater.toISOString().split('T')[0];
            await user.save();
          }
        }

        if (shouldCall) {
          console.log(`Initiating motivational wake-up call for ${user.name} (${user.phone})`);

          const webhookUrl = `${process.env.DOMAIN}/assistant/voice/motivational-wakeup?userId=${user.id}`;
          await twilioService.makeCall(user.phone, webhookUrl);

          console.log(`Motivational wake-up call initiated for ${user.name}`);
        }
      }
    } catch (error) {
      console.error('Error processing motivational wake-up calls:', error);
    }
  }

  /**
   * Process proactive nudges
   */
  async processProactiveNudges() {
    try {
      const allUsers = await User.findAll();
      const users = allUsers.filter(user =>
        user.active &&
        user.onboarded &&
        user.preferences?.nudgeFrequency !== 'off'
      );

      console.log(`Checking proactive nudges for ${users.length} users`);

      for (const user of users) {
        // Quiet hours disabled
        // if (user.isInQuietHours()) continue;

        // Check for various nudge conditions
        await this.checkHabitReminders(user);
        await this.checkTaskDeadlines(user);
        // Could add more: hydration, movement, etc.
      }
    } catch (error) {
      console.error('Error processing proactive nudges:', error);
    }
  }

  /**
   * Check and send habit reminders
   */
  async checkHabitReminders(user) {
    const Habit = require('../models/Habit');

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find habits with reminder time matching current time
    const allHabits = await Habit.findByUserId(user.id);
    const habits = allHabits.filter(h =>
      h.active &&
      h.reminderTime === currentTime
    );

    for (const habit of habits) {
      // Check if already completed today
      const logs = await habit.getLogs(1);
      const today = new Date().toISOString().split('T')[0];

      const completedToday = logs.some(log =>
        log.date === today && log.completed
      );

      if (!completedToday) {
        const message = `🔔 Time for: ${habit.name}\n\nReply when done! Current streak: ${habit.streak.current} days 🔥`;
        await twilioService.sendSMS(user.phone, message);
        console.log(`Habit reminder sent to ${user.name}: ${habit.name}`);
      }
    }
  }

  /**
   * Check and send task deadline reminders
   */
  async checkTaskDeadlines(user) {
    const Task = require('../models/Task');

    // Find tasks due in the next hour that haven't been reminded about
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    const allTasks = await Task.findPending(user.id);
    const tasks = allTasks
      .filter(t => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate >= now && dueDate <= oneHourFromNow;
      })
      .slice(0, 3);

    if (tasks.length > 0) {
      const taskList = tasks.map(t => `• ${t.title}`).join('\n');
      const message = `⏰ Upcoming deadline${tasks.length > 1 ? 's' : ''}:\n\n${taskList}\n\nOn track?`;

      await twilioService.sendSMS(user.phone, message);
      console.log(`Task deadline reminder sent to ${user.name}: ${tasks.length} tasks`);
    }
  }

  /**
   * Check for tasks that are due now and trigger voice reminder calls
   */
  async processTaskReminderCalls() {
    const Task = require('../models/Task');
    const now = new Date();
    const currentTime = now.toISOString();

    console.log(`🔍 Checking for task reminders at ${currentTime}`);

    try {
      // Get all active users
      const allUsers = await User.findAll();
      const activeUsers = allUsers.filter(user => user.active && user.onboarded);

      console.log(`   Found ${activeUsers.length} active users to check`);

      for (const user of activeUsers) {
        // Find pending tasks for this user
        const allTasks = await Task.findPending(user.id);
        const tasksWithDates = allTasks.filter(t => t.due_date);

        console.log(`   ${user.name}: ${allTasks.length} pending tasks, ${tasksWithDates.length} with due dates`);

        // Filter tasks that are due within the current minute
        const dueNowTasks = allTasks.filter(t => {
          if (!t.due_date) return false;

          const dueDate = new Date(t.due_date);
          const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
          const nextMinute = new Date(currentMinute.getTime() + 60 * 1000);

          // Task is due if its due time is in the current minute
          const isDue = dueDate >= currentMinute && dueDate < nextMinute;

          if (tasksWithDates.length > 0 && tasksWithDates.length <= 3) {
            console.log(`      Task: "${t.title}" - Due: ${dueDate.toISOString()} - Current: ${currentMinute.toISOString()} - Is Due: ${isDue}`);
          }

          return isDue;
        });

        // Trigger voice call for each due task
        for (const task of dueNowTasks) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔔 TASK REMINDER CALL TRIGGERED BY SCHEDULER');
          console.log(`   User: ${user.name}`);
          console.log(`   Task: ${task.title}`);
          console.log(`   Due: ${new Date(task.due_date).toLocaleTimeString()}`);
          console.log(`   Priority: ${task.priority}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          const webhookUrl = `${process.env.DOMAIN}/assistant/voice/task-reminder?userId=${user.id}&taskId=${task.id}`;
          await twilioService.makeCall(user.phone, webhookUrl);

          console.log(`✅ Task reminder call initiated for ${user.name}: ${task.title}`);
          console.log(`   ℹ️  Luna will ask user to confirm completion during call`);
        }
      }
    } catch (error) {
      console.error('Error in processTaskReminderCalls:', error);
    }
  }

  /**
   * Reset monthly message counts for free tier users
   */
  async resetMessageCounts() {
    try {
      const now = new Date();

      const allUsers = await User.findAll();
      const usersToReset = allUsers.filter(user => {
        const resetDate = user.subscription?.resetDate;
        return (
          user.subscription?.tier === 'free' &&
          resetDate &&
          new Date(resetDate) <= now
        );
      });

      for (const user of usersToReset) {
        user.subscription.messageCount = 0;
        user.subscription.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        await user.save();
      }

      console.log(`Reset message counts for ${usersToReset.length} users`);
    } catch (error) {
      console.error('Error resetting message counts:', error);
    }
  }

  /**
   * Process Claude orchestrator scheduled calls from Supabase
   * Reads from call_sessions table and makes voice calls via Twilio
   */
  async processOrchestratorScheduledCalls() {
    try {
      const now = new Date();
      console.log(`[SCHEDULED CALLS] Checking for orchestrator-scheduled calls at ${now.toISOString()}`);

      // Query call_sessions instead of scheduled_calls
      const { data: sessions, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .eq('direction', 'outbound')
        .lte('scheduled_for', now.toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('[SCHEDULED CALLS] ✗ Error querying call_sessions:', error);
        return;
      }

      console.log(`[SCHEDULED CALLS] Found ${sessions?.length || 0} scheduled calls`);

      if (!sessions || sessions.length === 0) {
        return;
      }

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🤖 ORCHESTRATOR: ${sessions.length} scheduled call(s) due`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      for (const session of sessions) {
        try {
          console.log(`\n📞 Executing orchestrator call:`);
          console.log(`   Session ID: ${session.id}`);
          console.log(`   User ID: ${session.user_id}`);
          console.log(`   Type: ${session.call_type}`);
          console.log(`   Scheduled: ${session.scheduled_for}`);
          console.log(`   Has Briefing: ${!!session.briefing}`);
          if (session.briefing) {
            console.log(`   Briefing Trigger: ${session.briefing.trigger_reason}`);
            console.log(`   Briefing Goals: ${session.briefing.conversation_goals?.join(', ') || 'none'}`);
          }

          // Get user phone from MongoDB
          const user = await User.findById(session.user_id);
          if (!user) {
            console.error(`   ✗ User not found for session ${session.id}`);
            await this.markSessionFailed(session.id, 'User not found in database');
            continue;
          }

          if (!user.phone) {
            console.error(`   ✗ No phone number for user ${session.user_id}`);
            await this.markSessionFailed(session.id, 'User has no phone number');
            continue;
          }

          console.log(`   User: ${user.name} (${user.phone})`);

          // Build webhook URL with sessionId (KEY CHANGE!)
          const domain = process.env.DOMAIN || 'https://choretrackernew-production.up.railway.app';
          const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

          let webhookUrl;
          switch (session.call_type) {
            case 'motivational-wakeup':
              webhookUrl = `${baseUrl}/assistant/voice/motivational-wakeup?userId=${session.user_id}&sessionId=${session.id}`;
              break;
            case 'scolding':
              webhookUrl = `${baseUrl}/assistant/voice/custom-scolding?userId=${session.user_id}&sessionId=${session.id}`;
              break;
            case 'morning-briefing':
              webhookUrl = `${baseUrl}/assistant/voice/morning-briefing?userId=${session.user_id}&sessionId=${session.id}`;
              break;
            case 'task-reminder':
              webhookUrl = `${baseUrl}/assistant/voice/task-reminder?userId=${session.user_id}&sessionId=${session.id}`;
              break;
            case 'wind-down-reflection':
              webhookUrl = `${baseUrl}/assistant/voice/wind-down-reflection?userId=${session.user_id}&sessionId=${session.id}`;
              break;
            default:
              console.error(`   ✗ Unknown call type: ${session.call_type}`);
              await this.markSessionFailed(session.id, `Unknown call type: ${session.call_type}`);
              continue;
          }

          // Update status to in-progress BEFORE making call
          await supabase
            .from('call_sessions')
            .update({
              status: 'in-progress',
              started_at: now.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('id', session.id);

          // Make the Twilio call
          await twilioService.makeCall(user.phone, webhookUrl);

          console.log(`   ✓ Call initiated successfully for session ${session.id}`);

        } catch (callError) {
          console.error(`   ✗ Error executing session ${session.id}:`, callError.message);
          await this.markSessionFailed(session.id, callError.message);
        }
      }

      console.log(`\n✓ Orchestrator scheduled calls processing complete\n`);

    } catch (error) {
      console.error('Error in processOrchestratorScheduledCalls:', error);
    }
  }

  /**
   * Mark a call session as failed
   * @param {string} sessionId - Call session ID
   * @param {string} reason - Failure reason
   */
  async markSessionFailed(sessionId, reason) {
    try {
      await supabase
        .from('call_sessions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          outcome_assessment: {
            error: reason,
            goal_achieved: false,
            effectiveness: 'low'
          }
        })
        .eq('id', sessionId);

      console.log(`   ✗ Session ${sessionId} marked as failed: ${reason}`);
    } catch (error) {
      console.error(`   ✗ Error marking session ${sessionId} as failed:`, error);
    }
  }
}

module.exports = new Scheduler();
