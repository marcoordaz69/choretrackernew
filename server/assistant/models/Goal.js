const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: String,
  targetDate: Date,
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date
});

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssistantUser',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['health', 'career', 'financial', 'learning', 'relationships', 'personal', 'other'],
    default: 'other'
  },
  timeframe: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'long-term'],
    required: true
  },
  targetDate: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'abandoned'],
    default: 'active'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isQuantifiable: {
    type: Boolean,
    default: false
  },
  metric: {
    unit: String, // 'lbs', 'books', 'dollars', etc.
    current: Number,
    target: Number
  },
  milestones: [milestoneSchema],
  relatedHabits: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit'
  }],
  notes: [String],
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to update progress
goalSchema.methods.updateProgress = async function() {
  if (this.isQuantifiable && this.metric.target) {
    this.progress = Math.min(100, (this.metric.current / this.metric.target) * 100);
  }

  // Check if target date passed
  if (this.targetDate && new Date() > this.targetDate && this.status === 'active') {
    this.status = 'paused'; // Could trigger a check-in
  }

  await this.save();
};

// Method to mark as completed
goalSchema.methods.complete = async function() {
  this.status = 'completed';
  this.progress = 100;
  this.completedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('Goal', goalSchema);
