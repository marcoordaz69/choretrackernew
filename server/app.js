const express = require('express');
const cors = require('cors');
const chatRouter = require('./routes/chat');
const choresRoutes = require('./routes/chores');

const app = express();

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/chat', chatRouter);
app.use('/api/chat/chores', choresRoutes);
// ... other routes and middleware

app.use((err, req, res, next) => {
  console.error('Global error handler');
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
});
