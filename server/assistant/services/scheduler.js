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
      const users = await User.find({
        active: true,
        onboarded: true,
        'preferences.morningCheckInTime': currentTime
      });

      console.log(`Processing morning check-ins for ${users.length} users at ${currentTime}`);

      for (const user of users) {
        // Skip if in quiet hours
        if (user.isInQuietHours()) {
          console.log(`User ${user.phone} is in quiet hours, skipping`);
          continue;
        }

        // Generate and send morning briefing
        const briefing = await aiService.generateMorningBriefing(user._id);
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

      const users = await User.find({
        active: true,
        onboarded: true,
        'preferences.eveningCheckInTime': currentTime
      });

      console.log(`Processing evening check-ins for ${users.length} users at ${currentTime}`);

      for (const user of users) {
        if (user.isInQuietHours()) continue;

        const reflection = await aiService.generateEveningReflection(user._id);
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
      const users = await User.find({
        active: true,
        onboarded: true,
        'preferences.nudgeFrequency': { $ne: 'off' }
      });

      console.log(`Checking proactive nudges for ${users.length} users`);

      for (const user of users) {
        if (user.isInQuietHours()) continue;

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
    const DailyCheckIn = require('../models/DailyCheckIn');

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find habits with reminder time matching current time
    const habits = await Habit.find({
      userId: user._id,
      active: true,
      reminderTime: currentTime
    });

    for (const habit of habits) {
      // Check if already completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedToday = habit.logs.some(log => {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime() && log.completed;
      });

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

    const tasks = await Task.find({
      userId: user._id,
      status: 'pending',
      dueDate: {
        $gte: new Date(),
        $lte: oneHourFromNow
      }
    }).limit(3);

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

      const usersToReset = await User.find({
        'subscription.tier': 'free',
        'subscription.resetDate': { $lte: now }
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
