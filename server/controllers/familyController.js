const User = require('../models/User');

exports.updateFamilyProfile = async (req, res) => {
  try {
    const { userId, familyName } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { familyName: familyName } },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteAvatar = async (req, res) => {
  try {
    const { userId, avatarId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove the avatar from the user's profile in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { avatars: avatarId } },
      { new: true }
    );

    // Optionally, delete the avatar file from your storage

    res.status(200).json({ message: 'Avatar deleted successfully', user: updatedUser });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ message: 'Error deleting avatar', error: error.message });
  }
};

exports.addAvatar = async (req, res) => {
  try {
    const { userId } = req.body;
    const avatarUrl = req.file.path; // Assuming the upload middleware saves the file and provides the path

    // Add the avatar to the user's profile in the database
    // This will depend on your database schema and ORM
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { avatars: avatarUrl } },
      { new: true }
    );

    res.status(200).json({ message: 'Avatar added successfully', user: updatedUser });
  } catch (error) {
    console.error('Error adding avatar:', error);
    res.status(500).json({ message: 'Error adding avatar', error: error.message });
  }
};

exports.getChores = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    const avatar = user.avatars.id(avatarId);
    
    const today = new Date();
    const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' });
    
    const choresToday = avatar.chores.filter(chore => 
      chore.daysOfWeek.includes(dayOfWeek) || chore.daysOfWeek.includes(today.toISOString().split('T')[0])
    );

    res.status(200).json({ chores: choresToday, completedChores: avatar.completedChores });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chores', error: error.message });
  }
};

exports.addChore = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const { day, chore, recurring, daysOfWeek } = req.body;
    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    const avatar = user.avatars.id(avatarId);
    
    const newChore = {
      name: chore,
      recurring,
      daysOfWeek: recurring ? daysOfWeek : [day],
    };

    if (!avatar.chores) {
      avatar.chores = [];
    }
    avatar.chores.push(newChore);
    await user.save();
    
    res.status(200).json({ chores: avatar.chores });
  } catch (error) {
    res.status(500).json({ message: 'Error adding chore', error: error.message });
  }
};

exports.toggleChore = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const { day, chore, completed } = req.body;
    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    const avatar = user.avatars.id(avatarId);
    if (!avatar.completedChores[day]) {
      avatar.completedChores[day] = {};
    }
    avatar.completedChores[day][chore] = completed;
    await user.save();
    res.status(200).json({ completedChores: avatar.completedChores });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling chore', error: error.message });
  }
};