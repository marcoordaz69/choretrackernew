const mongoose = require('mongoose');

const choreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  days: { type: [String], enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  date: String, // If `date` is a string for specific needs, ensure consistency.
  day: String,  // This may overlap with `days`; consider its specific use.
  isRecurring: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  completedDate: Date,
  completedInstances: [{ date: Date, completed: Boolean }], // Suggested addition
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