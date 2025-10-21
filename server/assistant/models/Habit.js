const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: String,
  value: Number // For quantifiable habits (e.g., minutes exercised)
});

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssistantUser',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['health', 'productivity', 'learning', 'relationships', 'mindfulness', 'other'],
    default: 'other'
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  },
  targetDays: [String], // ['monday', 'wednesday', 'friday']
  reminderTime: String, // HH:mm format
  isQuantifiable: {
    type: Boolean,
    default: false
  },
  unit: String, // 'minutes', 'pages', 'glasses', etc.
  targetValue: Number,
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastCompleted: Date
  },
  logs: [habitLogSchema],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to log habit completion
habitSchema.methods.logCompletion = async function(value = null, notes = '') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already logged today
  const existingLog = this.logs.find(log => {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });

  if (existingLog) {
    existingLog.completed = true;
    existingLog.value = value;
    existingLog.notes = notes;
  } else {
    this.logs.push({
      date: today,
      completed: true,
      value,
      notes
    });
  }

  // Update streak
  this.updateStreak();
  await this.save();
};

// Method to update streak
habitSchema.methods.updateStreak = function() {
  const sortedLogs = this.logs
    .filter(log => log.completed)
    .sort((a, b) => b.date - a.date);

  if (sortedLogs.length === 0) {
    this.streak.current = 0;
    return;
  }

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const current = new Date(sortedLogs[i].date);
    const next = new Date(sortedLogs[i + 1].date);
    const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  this.streak.current = streak;
  this.streak.longest = Math.max(this.streak.longest, streak);
  this.streak.lastCompleted = sortedLogs[0].date;
};

module.exports = mongoose.model('Habit', habitSchema);
