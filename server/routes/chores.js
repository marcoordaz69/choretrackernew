const express = require('express');
const router = express.Router();
const choreController = require('../controllers/choreController');
const User = require('../models/User');

// Get chores for a specific avatar
router.get('/:avatarId', async (req, res) => {
  try {
    const { avatarId } = req.params;
    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    const avatar = user.avatars.id(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    // Organize chores by day of the week
    const organizedChores = avatar.chores.reduce((acc, chore) => {
      const day = chore.day || 'Unscheduled';
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push({
        ...chore.toObject(),
        completed: chore.completed || false
      });
      return acc;
    }, {});

    console.log('Organized chores:', organizedChores);
    res.json({
       chores: organizedChores
    });
  } catch (error) {
    console.error('Error fetching chores:', error);
    res.status(500).json({ message: 'Failed to fetch chores', error: error.message });
  }
});

// Toggle chore completion status
router.post('/:avatarId/toggle', async (req, res) => {
  try {
    const { avatarId } = req.params;
    const { choreId, completed } = req.body;

    if (!choreId) {
      return res.status(400).json({ message: 'Chore ID is required' });
    }

    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const avatar = user.avatars.id(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const chore = avatar.chores.id(choreId);
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    chore.completed = completed;
    chore.completedDate = completed ? new Date() : null;

    await user.save();

    res.json({
       message: 'Chore status updated successfully',
       chore: chore
    });
  } catch (error) {
    console.error('Error toggling chore:', error);
    res.status(500).json({ message: 'Failed to update chore status', error: error.message });
  }
});

// Add a new chore
router.post('/:avatarId/add', choreController.addChore);

// Delete a chore
router.delete('/:avatarId/:choreId', choreController.deleteChore);

// Get all chores for an avatar
router.get('/:avatarId/all', choreController.getAllChores);

// New route: Get chores for a specific date
router.get('/', async (req, res) => {
  try {
    const { date, userId } = req.query;
    
    if (!date || !userId) {
      return res.status(400).json({ error: 'Date and userId are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const queryDate = new Date(date);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][queryDate.getDay()];

    let choresForDate = [];
    user.avatars.forEach(avatar => {
      const matchingChores = avatar.chores.filter(chore => 
        (chore.date && new Date(chore.date).toDateString() === queryDate.toDateString()) ||
        (chore.day === dayOfWeek) ||
        (chore.isRecurring && chore.days && chore.days.includes(dayOfWeek))
      );
      choresForDate = choresForDate.concat(matchingChores);
    });

    res.json({ chores: choresForDate.map(chore => chore.name) });
  } catch (error) {
    console.error('Error fetching chores for date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;