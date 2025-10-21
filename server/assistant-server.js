/**
 * Personal Assistant Server
 * SMS + Voice AI Life Coach
 *
 * A standalone server for the personal assistant that transforms lives through:
 * - SMS-first interaction (zero friction)
 * - Voice calls with OpenAI Realtime API
 * - Proactive check-ins and nudges
 * - Habit tracking, goal setting, task management
 * - AI-powered insights and coaching
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const http = require('http');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhooks
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Personal Assistant',
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Personal Assistant
const { initializeAssistant, shutdownAssistant } = require('./assistant');
initializeAssistant(app);

// Create HTTP server
const server = http.createServer(app);

// Start server
const PORT = process.env.ASSISTANT_PORT || 5001;
server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🤖 Personal Assistant Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Port: ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('  Twilio Configuration:');
  console.log(`  - Account SID: ${process.env.TWILIO_ACCOUNT_SID ? '✓' : '✗'}`);
  console.log(`  - Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '✓' : '✗'}`);
  console.log(`  - Phone Number: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log('');
  console.log('  OpenAI Configuration:');
  console.log(`  - API Key: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
  console.log('');
  console.log('  Webhook Endpoints:');
  console.log(`  - SMS: ${process.env.DOMAIN || 'http://localhost:' + PORT}/assistant/webhooks/sms/incoming`);
  console.log(`  - Voice: ${process.env.DOMAIN || 'http://localhost:' + PORT}/assistant/webhooks/voice/incoming`);
  console.log('');
  console.log('  Status: Ready to transform lives 🚀');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  shutdownAssistant();
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  shutdownAssistant();
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
