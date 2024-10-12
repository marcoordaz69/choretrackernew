const mongoose = require('mongoose');
require('dotenv').config();

console.log('MongoDB URI:', process.env.MONGODB_URI); // Be careful not to log this in production

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });