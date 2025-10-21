const mongoose = require('mongoose');

const dailyCheckInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssistantUser',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  morning: {
    completed: { type: Boolean, default: false },
    sleepQuality: { type: Number, min: 1, max: 10 },
    mood: { type: Number, min: 1, max: 10 },
    energy: { type: Number, min: 1, max: 10 },
    gratitude: String,
    topPriorities: [String],
    completedAt: Date
  },
  evening: {
    completed: { type: Boolean, default: false },
    dayRating: { type: Number, min: 1, max: 10 },
    wins: [String],
    learnings: String,
    tomorrowPriorities: [String],
    reflection: String,
    completedAt: Date
  },
  metrics: {
    exerciseMinutes: Number,
    waterGlasses: Number,
    mealsLogged: Number,
    screenTime: Number,
    sleepHours: Number
  },
  mood: {
    overall: { type: Number, min: 1, max: 10 },
    tags: [String], // 'stressed', 'happy', 'anxious', 'energized'
    note: String
  }
}, {
  timestamps: true
});

// Compound index for efficient user date queries
dailyCheckInSchema.index({ userId: 1, date: -1 });

// Static method to get or create today's check-in
dailyCheckInSchema.statics.getTodayCheckIn = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkIn = await this.findOne({ userId, date: today });

  if (!checkIn) {
    checkIn = await this.create({ userId, date: today });
  }

  return checkIn;
};

module.exports = mongoose.model('DailyCheckIn', dailyCheckInSchema);
