const express = require('express');
const expressWs = require('express-ws');
const webhookRoutes = require('./routes/webhooks');
const voiceRoutes = require('./routes/voice');
const elevenlabsWebhookRoutes = require('./routes/elevenlabs-webhooks');
const { setupElevenLabsRoutes } = require('./elevenlabs-twilio-bridge');
const scheduler = require('./services/scheduler');

/**
 * Initialize the Personal Assistant module
 * @param {express.Application} app - Express app instance
 * @param {http.Server} server - HTTP server instance (optional, for WebSocket)
 */
function initializeAssistant(app, server) {
  console.log('Initializing Personal Assistant...');

  // Enable WebSocket support with HTTP server
  const wsInstance = server ? expressWs(app, server) : expressWs(app);

  // Mount routes
  app.use('/assistant/webhooks', webhookRoutes);
  app.use('/assistant/elevenlabs', elevenlabsWebhookRoutes);

  // Initialize voice routes with WebSocket support
  const voiceRouter = voiceRoutes(wsInstance.app);
  app.use('/assistant/voice', voiceRouter);

  // Setup ElevenLabs Twilio bridge (WebSocket)
  try {
    console.log('[INIT] Setting up ElevenLabs routes...');
    console.log('[INIT] wsInstance.app type:', typeof wsInstance.app);
    console.log('[INIT] wsInstance.app.ws exists:', typeof wsInstance.app.ws);
    setupElevenLabsRoutes(wsInstance.app);
    console.log('[INIT] ElevenLabs routes setup completed');
  } catch (error) {
    console.error('[INIT] Error setting up ElevenLabs routes:', error);
    console.error('[INIT] Stack trace:', error.stack);
  }

  // Start scheduler for proactive check-ins
  scheduler.start();

  console.log('Personal Assistant initialized successfully');
  console.log('  - SMS webhooks: /assistant/webhooks/sms/incoming');
  console.log('  - Voice webhooks: /assistant/webhooks/voice/incoming');
  console.log('  - Voice stream: ws://your-domain/assistant/voice/stream');
  console.log('  - ElevenLabs call: /elevenlabs/call/incoming');
  console.log('  - ElevenLabs stream: ws://your-domain/elevenlabs/media-stream');
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
