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

          console.log('Extracted parameters:', { userId, callSid, streamSid });

          if (!userId || !callSid || !streamSid) {
            console.error('Missing userId, callSid, or streamSid in start message');
            ws.close();
            return;
          }

          // Initialize voice service with these parameters INCLUDING streamSid
          await voiceService.handleVoiceStream(ws, userId, callSid, streamSid);
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
      "Hey! Let's do a quick reflection on your day. Ready?"
    );

    res.type('text/xml').send(twiml);
  });

  return router;
};
