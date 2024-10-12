const mongoose = require('mongoose');

const choreSchema = new mongoose.Schema({
  name: String,
  days: [String],
  date: String,
  day: String,
  isRecurring: Boolean,
  completed: { type: Boolean, default: false },
  completedDate: Date,
  createdAt: { type: Date, default: Date.now }
});

const avatarSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  chores: [choreSchema]
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  familyName: String,
  avatars: [avatarSchema],
  role: String, // Add this line to keep the role field
});

module.exports = mongoose.model('User', userSchema);