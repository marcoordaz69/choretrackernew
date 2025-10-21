const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const aiService = require('../services/aiService');
const User = require('../models/User');
const Interaction = require('../models/Interaction');

// Additional body parser middleware specifically for Twilio webhooks
// This helps ensure body is parsed even if global middleware fails
router.use(express.urlencoded({ extended: true, limit: '10mb' }));
router.use(express.json({ limit: '10mb' }));

/**
 * POST /sms/incoming
 * Handle incoming SMS messages from Twilio
 */
router.post('/sms/incoming', async (req, res) => {
  try {
    // Enhanced debugging for production issues
    console.log('=== WEBHOOK DEBUG START ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Full body:', JSON.stringify(req.body, null, 2));
    console.log('=== WEBHOOK DEBUG END ===');

    const { From, Body, MessageSid, NumMedia } = req.body;

    console.log(`Incoming SMS from ${From}: ${Body}`);

    // Validate required fields
    if (!From) {
      console.error('Missing From field in webhook');
      return res.status(400).send('Missing required fields');
    }

    // Check if this is an MMS without text
    const hasMedia = NumMedia && parseInt(NumMedia) > 0;
    const hasBody = Body !== undefined && Body !== null && Body.trim() !== '';

    if (!hasBody) {
      console.log('Missing or empty Body field:', {
        From,
        Body,
        bodyType: typeof Body,
        NumMedia,
        hasMedia,
        allFields: Object.keys(req.body || {})
      });

      if (hasMedia) {
        console.log('MMS received without text - sending acknowledgment');
        const user = await User.findByPhone(From);
        if (user) {
          await twilioService.sendSMS(From, "I received your media message, but I can't process images yet. Can you describe it in text?");
        }
        return res.status(200).send('OK');
      }

      console.error('No Body and no media - this is likely a webhook parsing error');
      return res.status(400).send('Missing message body');
    }

    // Find or create user
    let user = await User.findByPhone(From);

    if (!user) {
      // New user - start onboarding
      user = await User.create({
        phone: From,
        name: 'Friend', // Will be updated during onboarding
        onboarded: false
      });

      const welcomeMessage = `Hey there! I'm your personal life assistant. I'm here to help you optimize your daily routine, track habits, achieve goals, and generally make life easier.\n\nWhat should I call you?`;

      const smsResult = await twilioService.sendSMS(From, welcomeMessage);

      // Check delivery status after a brief delay
      setTimeout(async () => {
        try {
          const status = await twilioService.getMessageStatus(smsResult.sid);
          console.log(`Welcome message ${smsResult.sid} status:`, status);
          if (status.errorCode) {
            console.error(`⚠️  WELCOME SMS DELIVERY FAILED - Error ${status.errorCode}: ${status.errorMessage}`);
          }
        } catch (err) {
          console.error('Error checking welcome message status:', err);
        }
      }, 2000);

      await Interaction.create({
        userId: user.id,
        type: 'sms_outbound',
        direction: 'outbound',
        content: { assistantResponse: welcomeMessage },
        metadata: { twilioSid: MessageSid }
      });

      return res.status(200).send('OK');
    }

    // Quiet hours disabled for now
    // if (user.isInQuietHours()) {
    //   console.log(`User ${user.phone} is in quiet hours, deferring response`);
    //   return res.status(200).send('OK');
    // }

    // Handle onboarding flow
    if (!user.onboarded) {
      await handleOnboarding(user, Body);
      return res.status(200).send('OK');
    }

    // Increment message count
    await user.incrementMessageCount();

    // Process message with AI
    const aiResponse = await aiService.processMessage(user.id, Body);

    // Send response
    if (aiResponse.responseText) {
      await twilioService.sendSMS(From, aiResponse.responseText);

      await Interaction.create({
        userId: user.id,
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
    const user = await User.findByPhone(From);

    if (!user) {
      console.log(`User not found for phone: ${From}`);
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

    console.log(`User found: ${user.name} (ID: ${user.id})`);

    // Generate WebSocket URL for OpenAI Realtime API
    const host = req.get('host');
    const websocketUrl = `wss://${host}/assistant/voice/stream?userId=${user.id}&callSid=${CallSid}`;

    console.log(`Generated WebSocket URL: ${websocketUrl}`);

    const twiml = twilioService.generateAIVoiceTwiML(
      websocketUrl,
      `Hey ${user.name}! What's on your mind?`
    );

    console.log(`Sending TwiML response (${twiml.length} bytes)`);
    console.log(`TwiML: ${twiml}`);

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
 * Handle onboarding flow - Multi-step SMS-based setup
 */
async function handleOnboarding(user, message) {
  // Track onboarding progress in ai_context
  const onboardingState = user.ai_context?.onboarding || { step: 'name' };
  const userMessage = (message || '').trim();

  let response = '';
  let nextStep = null;

  switch (onboardingState.step) {
    case 'name':
      // Step 1: Get user's name
      user.name = userMessage;
      nextStep = 'timezone';
      response = `Nice to meet you, ${user.name}! 😊\n\nWhat timezone are you in?\n\nExamples:\n• Eastern (ET)\n• Pacific (PT)\n• Central (CT)\n• Mountain (MT)\n\nOr reply "skip" to use Eastern Time.`;
      break;

    case 'timezone':
      // Step 2: Get timezone
      const timezoneMap = {
        'et': 'America/New_York',
        'eastern': 'America/New_York',
        'pt': 'America/Los_Angeles',
        'pacific': 'America/Los_Angeles',
        'ct': 'America/Chicago',
        'central': 'America/Chicago',
        'mt': 'America/Denver',
        'mountain': 'America/Denver',
        'skip': 'America/New_York'
      };

      const tz = timezoneMap[userMessage.toLowerCase()] || 'America/New_York';
      user.timezone = tz;
      nextStep = 'morning_time';
      response = `Got it! Set to ${tz.split('/')[1].replace('_', ' ')}.\n\nWhat time should I send your morning check-in?\n\n(e.g., "7:00", "8:30", "skip" for 7am)`;
      break;

    case 'morning_time':
      // Step 3: Morning check-in time
      const morningTime = parseMilitaryTime(userMessage) || '07:00';
      user.preferences = user.preferences || {};
      user.preferences.morningCheckInTime = morningTime;
      nextStep = 'evening_time';
      response = `Morning check-in set for ${formatTime(morningTime)}! ☀️\n\nWhat about your evening reflection?\n\n(e.g., "9:00", "21:30", "skip" for 9pm)`;
      break;

    case 'evening_time':
      // Step 4: Evening check-in time
      const eveningTime = parseMilitaryTime(userMessage) || '21:00';
      user.preferences.eveningCheckInTime = eveningTime;
      nextStep = 'nudge_frequency';
      response = `Evening reflection set for ${formatTime(eveningTime)}! 🌙\n\nHow often should I nudge you with reminders?\n\n1️⃣ High - Stay on top of everything\n2️⃣ Moderate - Balanced (recommended)\n3️⃣ Low - Minimal interruptions\n4️⃣ Off - Only when you ask\n\nReply with a number (1-4):`;
      break;

    case 'nudge_frequency':
      // Step 5: Nudge frequency
      const nudgeMap = {
        '1': 'high',
        'high': 'high',
        '2': 'moderate',
        'moderate': 'moderate',
        '3': 'low',
        'low': 'low',
        '4': 'off',
        'off': 'off'
      };

      const frequency = nudgeMap[userMessage.toLowerCase()] || 'moderate';
      user.preferences.nudgeFrequency = frequency;
      nextStep = 'quiet_hours';
      response = `Nudge frequency: ${frequency}! 👍\n\nWhen should I be quiet? (No messages during these hours)\n\nExamples:\n• "10pm to 7am"\n• "22:00 to 07:00"\n• "skip" (default: 10pm-7am)`;
      break;

    case 'quiet_hours':
      // Step 6: Quiet hours
      const quietHours = parseQuietHours(userMessage);
      user.preferences.quietHours = quietHours;
      nextStep = 'complete';

      // Mark onboarding as complete
      user.onboarded = true;
      user.ai_context = {
        ...user.ai_context,
        onboarding: { step: 'complete', completedAt: new Date() }
      };

      response = `Perfect! Your profile is all set up! 🎉\n\n📋 Your Settings:\n` +
        `• Morning check-in: ${formatTime(user.preferences.morningCheckInTime)}\n` +
        `• Evening reflection: ${formatTime(user.preferences.eveningCheckInTime)}\n` +
        `• Nudge frequency: ${user.preferences.nudgeFrequency}\n` +
        `• Quiet hours: ${formatTime(quietHours.start)} - ${formatTime(quietHours.end)}\n\n` +
        `🚀 What I can help with:\n` +
        `• Track habits & goals\n` +
        `• Manage tasks & reminders\n` +
        `• Daily check-ins & reflections\n` +
        `• Smart nudges & accountability\n\n` +
        `Try saying:\n` +
        `"Remind me to call mom tomorrow at 3pm"\n` +
        `"I exercised for 30 mins"\n` +
        `"Goal: read 12 books this year"\n\n` +
        `Ready to get started? 💪`;
      break;

    default:
      response = 'Something went wrong. Let\'s start over. What\'s your name?';
      nextStep = 'name';
  }

  // Update user with new onboarding state
  if (nextStep) {
    user.ai_context = {
      ...user.ai_context,
      onboarding: { step: nextStep }
    };
  }

  await user.save();
  const smsResult = await twilioService.sendSMS(user.phone, response);

  // Check delivery status after a brief delay
  setTimeout(async () => {
    try {
      const status = await twilioService.getMessageStatus(smsResult.sid);
      console.log(`Message ${smsResult.sid} status:`, status);
      if (status.errorCode) {
        console.error(`⚠️  SMS DELIVERY FAILED - Error ${status.errorCode}: ${status.errorMessage}`);
      }
    } catch (err) {
      console.error('Error checking message status:', err);
    }
  }, 2000);

  // Log interaction
  await Interaction.create({
    userId: user.id,
    type: 'sms_inbound',
    direction: 'inbound',
    content: { userMessage: message },
    metadata: { onboardingStep: onboardingState.step }
  });

  await Interaction.create({
    userId: user.id,
    type: 'sms_outbound',
    direction: 'outbound',
    content: { assistantResponse: response },
    metadata: { onboardingStep: nextStep }
  });
}

/**
 * Helper: Parse time input to 24-hour format
 */
function parseMilitaryTime(input) {
  if (!input || input.toLowerCase() === 'skip') return null;

  input = input.toLowerCase().trim();

  // Handle formats like "7:00", "8:30", "7", "9pm", "7:30am"
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = input.match(timeRegex);

  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  // Convert to 24-hour format
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Helper: Parse quiet hours input
 */
function parseQuietHours(input) {
  if (!input || input.toLowerCase() === 'skip') {
    return { start: '22:00', end: '07:00' };
  }

  // Try to parse "10pm to 7am" or "22:00 to 07:00"
  const parts = input.split(/to|-/);

  if (parts.length === 2) {
    const start = parseMilitaryTime(parts[0].trim()) || '22:00';
    const end = parseMilitaryTime(parts[1].trim()) || '07:00';
    return { start, end };
  }

  return { start: '22:00', end: '07:00' };
}

/**
 * Helper: Format military time to 12-hour
 */
function formatTime(militaryTime) {
  const [hours, minutes] = militaryTime.split(':').map(Number);
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
}

module.exports = router;
