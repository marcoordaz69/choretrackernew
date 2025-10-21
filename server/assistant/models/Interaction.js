const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssistantUser',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['sms_inbound', 'sms_outbound', 'voice_inbound', 'voice_outbound'],
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  content: {
    userMessage: String,
    assistantResponse: String,
    transcript: String // For voice calls
  },
  metadata: {
    duration: Number, // For voice calls in seconds
    twilioSid: String,
    processed: Boolean,
    intent: String, // task_create, habit_log, mood_track, etc.
    extractedData: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient user queries
interactionSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);
