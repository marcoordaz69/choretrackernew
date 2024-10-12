const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if password exists
    if (!user.password) {
      return res.status(400).json({ message: 'Password not set for this user' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and assign token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        familyName: user.familyName
      },
      hasFamilyProfile: !!user.familyName
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// You'll need to implement this function
async function checkFamilyProfile(userId) {
  // Check if the user has a family profile
  // Return true if they do, false if they don't
  // This is just a placeholder, you'll need to implement the actual logic
  return false;
}

exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, age } = req.body;

    const existingUser = await User.findOne({ email }).maxTimeMS(5000);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      age
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Add this function to the existing file
exports.updateFamilyProfile = async (req, res) => {
  console.log('updateFamilyProfile function called');
  try {
    const { userId, familyName } = req.body;
    console.log('Updating family profile for user:', userId, 'with family name:', familyName);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { familyName: familyName },
      { new: true }
    );

    if (!updatedUser) {
      console.log('User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Family profile updated successfully:', updatedUser);
    res.json({ message: 'Family profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update family profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error. Please try again.', error: error.message });
  }
};

exports.getFamilyProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('familyName avatars');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('Fetched family profile:', user);
    res.json({ familyName: user.familyName, avatars: user.avatars });
  } catch (error) {
    console.error('Error fetching family profile:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.addAvatar = async (req, res) => {
  try {
    const { userId, name } = req.body;
    const image = req.file;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let imageUrl = null;
    if (image) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `avatar-${uniqueSuffix}${path.extname(image.originalname)}`;
      const filepath = path.join('uploads', filename);

      // Ensure the uploads directory exists
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.renameSync(image.path, path.join(__dirname, '..', filepath));
      imageUrl = `/uploads/${filename}`; // This is the correct path to save
    }

    const newAvatar = {
      name,
      imageUrl,
      chores: []
    };

    user.avatars.push(newAvatar);
    await user.save();

    console.log('New avatar created:', newAvatar);

    res.status(201).json({ message: 'Avatar added successfully', avatar: newAvatar });
  } catch (error) {
    console.error('Error adding avatar:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Add a new function to handle adding chores to an avatar
exports.addChoreToAvatar = async (req, res) => {
  try {
    const { userId, avatarId, choreName, choreDescription, choreDueDate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const avatar = user.avatars.id(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const newChore = {
      name: choreName,
      description: choreDescription,
      dueDate: new Date(choreDueDate),
      completed: false
    };

    avatar.chores.push(newChore);
    await user.save();

    res.status(201).json({ message: 'Chore added successfully', chore: newChore });
  } catch (error) {
    console.error('Error adding chore:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.getAvatar = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const user = await User.findOne({ 'avatars._id': avatarId });
    
    if (!user) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    const avatar = user.avatars.id(avatarId);
    res.json({ avatar });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};