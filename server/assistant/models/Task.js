const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
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
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'health', 'learning', 'relationships', 'other'],
    default: 'personal'
  },
  dueDate: Date,
  reminderTime: Date,
  relatedGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  energyLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium' // Suggests when to do the task
  },
  estimatedDuration: Number, // in minutes
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

// Method to mark as completed
taskSchema.methods.complete = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('Task', taskSchema);
