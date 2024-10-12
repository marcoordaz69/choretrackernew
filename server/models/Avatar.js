const mongoose = require('mongoose');

const AvatarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Add more fields for avatar customization (e.g., hair color, skin tone, etc.)
});

module.exports = mongoose.model('Avatar', AvatarSchema);