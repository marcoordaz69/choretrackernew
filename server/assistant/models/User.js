const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    sparse: true,
    trim: true
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  preferences: {
    morningCheckInTime: {
      type: String,
      default: '07:00' // HH:mm format
    },
    eveningCheckInTime: {
      type: String,
      default: '21:00'
    },
    nudgeFrequency: {
      type: String,
      enum: ['off', 'gentle', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    preferVoice: {
      type: Boolean,
      default: false
    },
    quietHours: {
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' }
    },
    enabledNudges: {
      movement: { type: Boolean, default: true },
      hydration: { type: Boolean, default: true },
      tasks: { type: Boolean, default: true },
      habits: { type: Boolean, default: true },
      relationships: { type: Boolean, default: true }
    }
  },
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    messageCount: {
      type: Number,
      default: 0
    },
    resetDate: {
      type: Date,
      default: Date.now
    }
  },
  aiContext: {
    personality: {
      type: String,
      default: 'supportive' // supportive, direct, humorous
    },
    learningData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  onboarded: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient phone number lookup
userSchema.index({ phone: 1 });

// Method to check if user is in quiet hours
userSchema.methods.isInQuietHours = function() {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const { start, end } = this.preferences.quietHours;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  return currentTime >= start && currentTime <= end;
};

// Method to increment message count
userSchema.methods.incrementMessageCount = async function() {
  this.subscription.messageCount++;
  this.lastActive = new Date();
  await this.save();
};

module.exports = mongoose.model('AssistantUser', userSchema);
