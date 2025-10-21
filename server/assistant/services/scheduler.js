const cron = require('node-cron');
const User = require('../models/User');
const twilioService = require('./twilioService');
const aiService = require('./aiService');

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
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Find users whose morning check-in time matches current time
      // Supabase doesn't support complex JSONB queries easily, so we fetch all active users
      // and filter in-memory (for now - can optimize with database functions later)
      const allUsers = await User.findAll();
      const users = allUsers.filter(user =>
        user.active &&
        user.onboarded &&
        user.preferences?.morningCheckInTime === currentTime
      );

      console.log(`Processing morning check-ins for ${users.length} users at ${currentTime}`);

      for (const user of users) {
        // Quiet hours disabled
        // if (user.isInQuietHours()) {
        //   console.log(`User ${user.phone} is in quiet hours, skipping`);
        //   continue;
        // }

        // Generate and send morning briefing
        const briefing = await aiService.generateMorningBriefing(user.id);
        await twilioService.sendSMS(user.phone, briefing);

        console.log(`Morning briefing sent to ${user.name} (${user.phone})`);
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
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const allUsers = await User.findAll();
      const users = allUsers.filter(user =>
        user.active &&
        user.onboarded &&
        user.preferences?.eveningCheckInTime === currentTime
      );

      console.log(`Processing evening check-ins for ${users.length} users at ${currentTime}`);

      for (const user of users) {
        // Quiet hours disabled
        // if (user.isInQuietHours()) continue;

        const reflection = await aiService.generateEveningReflection(user.id);
        await twilioService.sendSMS(user.phone, reflection);

        console.log(`Evening reflection sent to ${user.name} (${user.phone})`);
      }
    } catch (error) {
      console.error('Error processing evening check-ins:', error);
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
}

module.exports = new Scheduler();
