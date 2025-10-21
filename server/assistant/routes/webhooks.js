const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const aiService = require('../services/aiService');
const User = require('../models/User');
const Interaction = require('../models/Interaction');

/**
 * POST /sms/incoming
 * Handle incoming SMS messages from Twilio
 */
router.post('/sms/incoming', async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;

    console.log(`Incoming SMS from ${From}: ${Body}`);

    // Find or create user
    let user = await User.findOne({ phone: From });

    if (!user) {
      // New user - start onboarding
      user = await User.create({
        phone: From,
        name: 'Friend', // Will be updated during onboarding
        onboarded: false
      });

      const welcomeMessage = `Hey there! I'm your personal life assistant. I'm here to help you optimize your daily routine, track habits, achieve goals, and generally make life easier.\n\nWhat should I call you?`;

      await twilioService.sendSMS(From, welcomeMessage);

      await Interaction.create({
        userId: user._id,
        type: 'sms_outbound',
        direction: 'outbound',
        content: { assistantResponse: welcomeMessage },
        metadata: { twilioSid: MessageSid }
      });

      return res.status(200).send('OK');
    }

    // Check if user is in quiet hours
    if (user.isInQuietHours()) {
      console.log(`User ${user.phone} is in quiet hours, deferring response`);
      // Could store message and respond later
      return res.status(200).send('OK');
    }

    // Handle onboarding flow
    if (!user.onboarded) {
      await handleOnboarding(user, Body);
      return res.status(200).send('OK');
    }

    // Increment message count
    await user.incrementMessageCount();

    // Process message with AI
    const aiResponse = await aiService.processMessage(user._id, Body);

    // Send response
    if (aiResponse.responseText) {
      await twilioService.sendSMS(From, aiResponse.responseText);

      await Interaction.create({
        userId: user._id,
        type: 'sms_outbound',
        direction: 'outbound',
        content: { assistantResponse: aiResponse.responseText },
        metadata: {
          twilioSid: MessageSid,
          actions: aiResponse.actions
        }
      });
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling incoming SMS:', error);
    res.status(500).send('Error processing message');
  }
});

/**
 * POST /sms/status
 * Handle SMS delivery status callbacks
 */
router.post('/sms/status', (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  console.log(`SMS Status - SID: ${MessageSid}, Status: ${MessageStatus}, Error: ${ErrorCode || 'none'}`);
  res.status(200).send('OK');
});

/**
 * POST /voice/incoming
 * Handle incoming voice calls from Twilio
 */
router.post('/voice/incoming', async (req, res) => {
  try {
    const { From, CallSid } = req.body;

    console.log(`Incoming call from ${From}, SID: ${CallSid}`);

    // Find user
    const user = await User.findOne({ phone: From });

    if (!user) {
      // Unknown user - reject or onboard via voice
      const twiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, I don't recognize this number. Please text me first to get started.</Say>
          <Hangup/>
        </Response>
      `;
      return res.type('text/xml').send(twiml);
    }

    // Generate WebSocket URL for OpenAI Realtime API
    const websocketUrl = `wss://${req.get('host')}/assistant/voice/stream?userId=${user._id}&callSid=${CallSid}`;

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      `Hey ${user.name}! What's on your mind?`
    );

    res.type('text/xml').send(twiml);

  } catch (error) {
    console.error('Error handling incoming call:', error);
    const twiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Sorry, something went wrong. Please try again later.</Say>
        <Hangup/>
      </Response>
    `;
    res.type('text/xml').send(twiml);
  }
});

/**
 * POST /voice/status
 * Handle voice call status callbacks
 */
router.post('/voice/status', (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`Call Status - SID: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration || 0}s`);
  res.status(200).send('OK');
});

/**
 * Handle onboarding flow
 */
async function handleOnboarding(user, message) {
  const step = user.onboarded ? 'complete' : 'name';

  switch (step) {
    case 'name':
      // User provided their name
      user.name = message.trim();
      user.onboarded = true;
      await user.save();

      const onboardingComplete = `Great to meet you, ${user.name}! 🎉\n\nHere's what I can do:\n• Track habits & goals\n• Manage tasks\n• Daily check-ins\n• Smart reminders\n• Voice journaling\n\nTry saying:\n"Remind me to call mom"\n"I exercised for 30 mins"\n"Goal: read 12 books this year"\n\nReady to get started?`;

      await twilioService.sendSMS(user.phone, onboardingComplete);
      break;
  }
}

module.exports = router;
