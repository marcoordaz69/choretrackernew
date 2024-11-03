const User = require('../models/User');
const { format, parseISO, isValid, startOfDay, endOfDay } = require('date-fns');

// Helper function to organize chores by date
const organizeChoresByDate = (chores) => {
  const organized = {};
  
  chores.forEach(chore => {
    if (chore.isRecurring && Array.isArray(chore.days)) {
      // For recurring chores, add them to each day they occur
      chore.days.forEach(day => {
        // Convert day name to next occurrence of that day
        const nextDate = getNextDayOccurrence(day);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        
        if (!organized[dateStr]) {
          organized[dateStr] = [];
        }
        organized[dateStr].push({
          ...chore.toObject(),
          date: dateStr,
          isRecurring: true,
          recurringDay: day
        });
      });
    } else if (chore.date && isValid(parseISO(chore.date))) {
      // For one-time chores with valid dates
      const dateStr = format(parseISO(chore.date), 'yyyy-MM-dd');
      if (!organized[dateStr]) {
        organized[dateStr] = [];
      }
      organized[dateStr].push({
        ...chore.toObject(),
        date: dateStr,
        isRecurring: false
      });
    }
  });
  
  return organized;
};

// Helper function to get next occurrence of a day
const getNextDayOccurrence = (dayName) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const todayDay = today.getDay();
  const targetDay = days.indexOf(dayName);
  let daysUntilTarget = targetDay - todayDay;
  
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntilTarget);
  return nextDate;
};

exports.getChores = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    
    const avatar = user.avatars.id(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: 'Avatar not found in user document' });
    }

    // Organize chores by date
    const choresByDate = organizeChoresByDate(avatar.chores);

    // Get today's stats
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayChores = choresByDate[today] || [];
    const stats = {
      totalChores: todayChores.length,
      completedChores: todayChores.filter(chore => chore.completed).length
    };

    console.log('Sending organized chores:', {
      choresByDate,
      stats,
      completedChores: avatar.completedChores || []
    });

    res.json({
      chores: choresByDate,
      stats,
      completedChores: avatar.completedChores || []
    });

  } catch (error) {
    console.error('Error in getChores:', error);
    res.status(500).json({ message: 'Error fetching chores', error: error.message });
  }
};

exports.addChore = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const { choreName, days, date, isRecurring } = req.body;

    console.log('Request body:', req.body);

    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const avatar = user.avatars.id(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: 'Avatar not found in user document' });
    }

    let newChore;

    if (isRecurring) {
      if (!Array.isArray(days) || days.length === 0) {
        return res.status(400).json({ message: 'Days array is required for recurring chores' });
      }
      newChore = {
        name: choreName,
        days: days,
        isRecurring: true,
        createdAt: new Date()
      };
    } else {
      if (!date) {
        return res.status(400).json({ message: 'Date is required for non-recurring chores' });
      }
      let formattedDate;
      try {
        const parsedDate = parseISO(date);
        if (!isValid(parsedDate)) {
          throw new Error('Invalid date');
        }
        formattedDate = format(parsedDate, 'yyyy-MM-dd');
      } catch (dateError) {
        console.error('Error parsing date:', dateError);
        return res.status(400).json({ message: 'Invalid date format', error: dateError.message });
      }
      newChore = {
        name: choreName,
        date: formattedDate,
        day: format(parseISO(formattedDate), 'EEEE'),
        isRecurring: false,
        createdAt: new Date()
      };
    }

    // Check if the chore already exists
    const existingChore = avatar.chores.find(chore => 
      chore.name === newChore.name && 
      chore.isRecurring === newChore.isRecurring &&
      (chore.isRecurring ? JSON.stringify(chore.days) === JSON.stringify(newChore.days) : chore.date === newChore.date)
    );

    if (existingChore) {
      return res.status(400).json({ message: 'This chore already exists' });
    }

    // Add the new chore
    avatar.chores.push(newChore);
    await user.save();

    console.log('New chore added:', newChore);
    res.status(201).json({ message: 'Chore added successfully', chore: newChore });
  } catch (error) {
    console.error('Error in addChore:', error);
    res.status(500).json({ message: 'Error adding chore', error: error.message });
  }
};

exports.toggleChore = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const { choreId, completed } = req.body;

    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const avatar = user.avatars.id(avatarId);
    const chore = avatar.chores.id(choreId);

    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Update completion status
    chore.completed = completed;
    chore.lastCompleted = completed ? new Date() : null;

    // Update completedChores array
    if (completed) {
      if (!avatar.completedChores) {
        avatar.completedChores = [];
      }
      avatar.completedChores.push({
        choreId: chore._id,
        name: chore.name,
        completedAt: new Date()
      });
    } else {
      // Remove from completedChores if unchecked
      avatar.completedChores = avatar.completedChores.filter(
        c => c.choreId.toString() !== choreId
      );
    }

    await user.save();

    // Return updated chores organized by date
    const choresByDate = organizeChoresByDate(avatar.chores);
    
    res.json({
      message: 'Chore updated successfully',
      chores: choresByDate,
      completedChores: avatar.completedChores
    });

  } catch (error) {
    console.error('Error in toggleChore:', error);
    res.status(500).json({ message: 'Error updating chore', error: error.message });
  }
};

exports.getAllChores = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    const avatar = user.avatars.id(avatarId);
    res.json({ chores: avatar.chores });
  } catch (error) {
    console.error('Error in getAllChores:', error);
    res.status(500).json({ message: 'Error fetching all chores', error: error.message });
  }
};

exports.deleteChore = async (req, res) => {
  try {
    const { avatarId, choreId } = req.params;
    console.log('Deleting chore:', { avatarId, choreId });

    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user) {
      console.log('Avatar not found');
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const avatar = user.avatars.id(avatarId);
    if (!avatar) {
      console.log('Avatar not found in user document');
      return res.status(404).json({ message: 'Avatar not found in user document' });
    }

    const initialChoreCount = avatar.chores.length;
    avatar.chores = avatar.chores.filter(chore => chore._id.toString() !== choreId);
    const removedChoreCount = initialChoreCount - avatar.chores.length;

    if (removedChoreCount === 0) {
      console.log('No chore found with the given ID');
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Remove the chore from completedChores if it exists
    if (avatar.completedChores) {
      Object.keys(avatar.completedChores).forEach(day => {
        if (avatar.completedChores[day][choreId]) {
          delete avatar.completedChores[day][choreId];
        }
      });
    }

    await user.save();
    
    console.log('Chore deleted successfully:', choreId);
    res.status(200).json({ message: 'Chore deleted successfully', removedChoreCount });
  } catch (error) {
    console.error('Error in deleteChore:', error);
    res.status(500).json({ message: 'Error deleting chore', error: error.message });
  }
};