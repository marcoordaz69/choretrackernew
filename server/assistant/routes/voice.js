const express = require('express');
const voiceService = require('../services/voiceService');
const twilioService = require('../services/twilioService');

/**
 * Initialize voice routes with WebSocket support
 * @param {express.Application} app - WebSocket-enabled Express app
 * @returns {express.Router} Router instance
 */
module.exports = function(app) {
  const router = express.Router();

  /**
   * GET /stream
   * WebSocket endpoint for voice streaming
   */
  app.ws('/assistant/voice/stream', async (ws, req) => {
    console.log('WebSocket connection established, waiting for start message with parameters...');

    // Parameters come in the Twilio "start" message, not query params
    let userId = null;
    let callSid = null;
    let streamSid = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received WebSocket message:', data.event);

        // Extract parameters from the start message
        if (data.event === 'start') {
          console.log('Start message received:', JSON.stringify(data, null, 2));

          streamSid = data.streamSid;
          callSid = data.start?.callSid;

          // Extract custom parameters passed via TwiML
          const customParams = data.start?.customParameters || {};
          userId = customParams.userId;
          const customMode = customParams.customMode;
          const sessionId = customParams.sessionId;

          console.log('Extracted parameters:', { userId, callSid, streamSid, customMode, sessionId });
          console.log('[PARAM DEBUG] sessionId extracted from Twilio:', JSON.stringify(sessionId), 'type:', typeof sessionId);

          if (!userId || !callSid || !streamSid) {
            console.error('Missing userId, callSid, or streamSid in start message');
            ws.close();
            return;
          }

          // Initialize voice service with these parameters INCLUDING streamSid, customMode, and sessionId
          await voiceService.handleVoiceStream(ws, userId, callSid, streamSid, customMode, sessionId);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  /**
   * POST /outbound-reflection
   * TwiML for outbound reflection calls
   */
  router.post('/outbound-reflection', (req, res) => {
    const { userId } = req.query;

    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream?userId=${userId}&callSid=${req.body.CallSid}`;

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "Hey! Let's do a quick reflection on your day. Ready?",
      userId,
      req.body.CallSid
    );

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /custom-scolding
   * TwiML for custom scolding call with override instructions
   * Query params: userId, mode (e.g., "scolding:laundry", "scolding:gym"), sessionId
   */
  router.post('/custom-scolding', (req, res) => {
    const { userId, mode, sessionId } = req.query;

    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

    // Use provided mode or default to generic scolding
    const customMode = mode || 'scolding';

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "We need to talk.",
      userId,
      req.body.CallSid,
      customMode,
      sessionId
    );

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /motivational-wakeup
   * TwiML for motivational morning wake-up calls
   */
  router.post('/motivational-wakeup', (req, res) => {
    const { userId, sessionId } = req.query;

    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "Good morning! Rise and shine!",
      userId,
      req.body.CallSid,
      'motivational-wakeup',
      sessionId
    );

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /task-reminder
   * TwiML for task reminder calls
   */
  router.post('/task-reminder', (req, res) => {
    const { userId, taskId, sessionId } = req.query;

    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "Hey! I'm calling to remind you about a task.",
      userId,
      req.body.CallSid,
      `task-reminder:${taskId}`,
      sessionId
    );

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /morning-briefing
   * TwiML for evening briefing about tomorrow morning
   */
  router.post('/morning-briefing', (req, res) => {
    const { userId, sessionId } = req.query;

    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "Good evening! I'm calling to brief you on tomorrow.",
      userId,
      req.body.CallSid,
      'morning-briefing',
      sessionId
    );

    res.type('text/xml').send(twiml);
  });

  /**
   * POST /wind-down-reflection
   * TwiML for evening wind-down reflection
   */
  router.post('/wind-down-reflection', (req, res) => {
    const { userId, sessionId } = req.query;

    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "Hey, time to wind down. How was your day?",
      userId,
      req.body.CallSid,
      'wind-down-reflection',
      sessionId
    );

    res.type('text/xml').send(twiml);
  });

  // Custom butler call for wife's coke reminder
  router.post('/custom-butler-call', (req, res) => {
    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream`;

    // Use Marco's userId so the system works properly
    const marcoUserId = '5899f756-7e21-4ef2-a6f6-9b13e43efba5';

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      "Good evening. This is Luna, personal butler to His Majesty, King Marco.",
      marcoUserId,
      req.body.CallSid,
      'butler-coke-reminder'
    );

    res.type('text/xml').send(twiml);
  });

  return router;
};
