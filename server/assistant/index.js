const express = require('express');
const expressWs = require('express-ws');
const webhookRoutes = require('./routes/webhooks');
const voiceRoutes = require('./routes/voice');
const scheduler = require('./services/scheduler');

/**
 * Initialize the Personal Assistant module
 * @param {express.Application} app - Express app instance
 */
function initializeAssistant(app) {
  console.log('Initializing Personal Assistant...');

  // Enable WebSocket support
  const wsInstance = expressWs(app);

  // Mount routes
  app.use('/assistant/webhooks', webhookRoutes);

  // Initialize voice routes with WebSocket support
  const voiceRouter = voiceRoutes(wsInstance.app);
  app.use('/assistant/voice', voiceRouter);

  // Start scheduler for proactive check-ins
  scheduler.start();

  console.log('Personal Assistant initialized successfully');
  console.log('  - SMS webhooks: /assistant/webhooks/sms/incoming');
  console.log('  - Voice webhooks: /assistant/webhooks/voice/incoming');
  console.log('  - Voice stream: ws://your-domain/assistant/voice/stream');
}

/**
 * Shutdown the Personal Assistant module
 */
function shutdownAssistant() {
  console.log('Shutting down Personal Assistant...');
  scheduler.stop();
  console.log('Personal Assistant shut down successfully');
}

module.exports = {
  initializeAssistant,
  shutdownAssistant
};
