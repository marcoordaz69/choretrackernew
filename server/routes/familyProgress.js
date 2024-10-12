const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/family-progress', async (req, res) => {
  try {
    const users = await User.find({}, 'familyName avatars');
    console.log('Users fetched:', users); // Add this line for debugging

    const familyProgress = users.flatMap(user => 
      user.avatars.map(avatar => {
        console.log('Processing avatar:', avatar.name); // Add this line for debugging
        const chores = avatar.chores.reduce((acc, chore) => {
          const dateString = chore.date || chore.createdAt.toISOString().split('T')[0];
          if (!acc[dateString]) {
            acc[dateString] = [];
          }
          acc[dateString].push(chore);
          return acc;
        }, {});

        return {
          name: avatar.name,
          chores: chores
        };
      })
    );

    console.log('Family progress:', familyProgress); // Add this line for debugging
    res.json(familyProgress);
  } catch (error) {
    console.error('Error in family-progress route:', error); // Improve error logging
    res.status(500).json({ message: 'Error fetching family progress', error: error.message });
  }
});

module.exports = router;