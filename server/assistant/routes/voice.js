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
    console.log('WebSocket connection attempt');
    console.log('Query params:', req.query);
    console.log('Full URL:', req.url);

    const { userId, callSid } = req.query;

    if (!userId || !callSid) {
      console.error('Missing userId or callSid:', { userId, callSid, query: req.query });
      ws.close();
      return;
    }

    console.log(`WebSocket connected for user ${userId}, call ${callSid}`);
    await voiceService.handleVoiceStream(ws, userId, callSid);
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
