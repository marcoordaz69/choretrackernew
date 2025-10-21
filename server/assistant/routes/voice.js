const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');
const twilioService = require('../services/twilioService');

/**
 * GET /stream
 * WebSocket endpoint for voice streaming
 */
router.ws('/stream', async (ws, req) => {
  const { userId, callSid } = req.query;

  if (!userId || !callSid) {
    console.error('Missing userId or callSid');
    ws.close();
    return;
  }

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

module.exports = router;
