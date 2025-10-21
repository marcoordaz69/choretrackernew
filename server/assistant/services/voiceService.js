const WebSocket = require('ws');
const User = require('../models/User');
const Interaction = require('../models/Interaction');

class VoiceService {
  constructor() {
    this.activeSessions = new Map();
    console.log('Voice Service initialized');
  }

  /**
   * Handle WebSocket connection for voice call
   * Connects Twilio Media Stream <-> OpenAI Realtime API
   */
  async handleVoiceStream(ws, userId, callSid) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for voice stream');
        ws.close();
        return;
      }

      console.log(`Voice stream started for ${user.name} (${callSid})`);

      // Create OpenAI Realtime API WebSocket connection (GA)
      const openAIWs = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-realtime',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );

      // Store session
      const session = {
        twilioWs: ws,
        openAIWs,
        userId,
        callSid,
        streamSid: null,
        transcript: '',
        startTime: Date.now(),
        lastAssistantItem: null,
        latestMediaTimestamp: 0,
        responseStartTimestampTwilio: null,
        markQueue: [],
        mediaPacketCount: 0
      };

      this.activeSessions.set(callSid, session);

      // OpenAI WebSocket event handlers
      openAIWs.on('open', () => {
        console.log('OpenAI Realtime API connected');

        // Send session configuration (GA format)
        openAIWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            model: 'gpt-realtime',
            output_modalities: ['audio'],
            instructions: this.getVoiceInstructions(user),
            audio: {
              input: {
                format: {
                  type: 'audio/pcmu'
                },
                turn_detection: {
                  type: 'server_vad'
                }
              },
              output: {
                format: {
                  type: 'audio/pcmu'
                },
                voice: 'alloy'
              }
            }
          }
        }));
      });

      openAIWs.on('message', async (data) => {
        try {
          const event = JSON.parse(data.toString());
          await this.handleOpenAIEvent(event, session);
        } catch (error) {
          console.error('Error handling OpenAI message:', error);
        }
      });

      openAIWs.on('error', (error) => {
        console.error('OpenAI WebSocket error:', error);
      });

      openAIWs.on('close', () => {
        console.log('OpenAI WebSocket closed');
      });

      // Twilio WebSocket event handlers
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString());
          this.handleTwilioEvent(msg, session);
        } catch (error) {
          console.error('Error handling Twilio message:', error);
        }
      });

      ws.on('close', async () => {
        console.log('Twilio stream closed');
        openAIWs.close();

        // Save interaction
        const duration = Math.floor((Date.now() - session.startTime) / 1000);
        await Interaction.create({
          userId,
          type: 'voice_inbound',
          direction: 'inbound',
          content: {
            transcript: session.transcript
          },
          metadata: {
            duration,
            twilioSid: callSid
          }
        });

        this.activeSessions.delete(callSid);
      });

      ws.on('error', (error) => {
        console.error('Twilio WebSocket error:', error);
      });

    } catch (error) {
      console.error('Error handling voice stream:', error);
      ws.close();
    }
  }

  /**
   * Handle events from Twilio Media Stream
   */
  handleTwilioEvent(event, session) {
    switch (event.event) {
      case 'start':
        session.streamSid = event.start.streamSid;
        session.latestMediaTimestamp = 0;
        session.responseStartTimestampTwilio = null;
        session.lastAssistantItem = null;
        console.log('Media stream started:', session.streamSid);
        break;

      case 'media':
        // Track timestamp from incoming audio
        session.latestMediaTimestamp = parseInt(event.media.timestamp);

        // Log first few media packets for debugging
        if (!session.mediaPacketCount) {
          session.mediaPacketCount = 0;
        }
        session.mediaPacketCount++;
        if (session.mediaPacketCount <= 5) {
          console.log(`Received media packet ${session.mediaPacketCount}, timestamp: ${session.latestMediaTimestamp}`);
        }

        // Forward audio to OpenAI
        if (session.openAIWs.readyState === WebSocket.OPEN) {
          session.openAIWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: event.media.payload
          }));
        } else {
          console.error('OpenAI WebSocket not open, state:', session.openAIWs.readyState);
        }
        break;

      case 'mark':
        // Remove mark from queue when Twilio confirms playback
        if (session.markQueue.length > 0) {
          session.markQueue.shift();
        }
        break;

      case 'stop':
        console.log('Media stream stopped');
        break;
    }
  }

  /**
   * Handle events from OpenAI Realtime API
   */
  async handleOpenAIEvent(event, session) {
    // Log all events for debugging
    const logEventTypes = [
      'error', 'response.content.done', 'rate_limits.updated',
      'response.done', 'input_audio_buffer.committed',
      'input_audio_buffer.speech_stopped', 'input_audio_buffer.speech_started',
      'session.created', 'session.updated', 'response.created',
      'conversation.item.created', 'conversation.item.input_audio_transcription.completed',
      'response.output_audio.delta', 'response.output_audio.done'
    ];

    if (logEventTypes.includes(event.type)) {
      if (event.type === 'response.output_audio.delta') {
        console.log('OpenAI event: response.output_audio.delta - delta length:', event.delta ? event.delta.length : 'NO DELTA');
      } else {
        console.log('OpenAI event:', event.type, JSON.stringify(event).substring(0, 200));
      }
    }

    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session.id);
        break;

      case 'session.updated':
        console.log('Session updated');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        const userTranscript = event.transcript;
        console.log('User said:', userTranscript);
        session.transcript += `User: ${userTranscript}\n`;
        break;

      case 'response.output_audio.delta':
        // Stream audio back to Twilio (GA format)
        console.log('[AUDIO DEBUG] Received audio delta, length:', event.delta ? event.delta.length : 'NO DELTA');
        console.log('[AUDIO DEBUG] Twilio WS state:', session.twilioWs ? session.twilioWs.readyState : 'NO WEBSOCKET');
        console.log('[AUDIO DEBUG] Stream SID:', session.streamSid || 'NO STREAM SID');

        if (!event.delta) {
          console.error('No delta in response.output_audio.delta event!');
          break;
        }

        if (session.twilioWs.readyState !== WebSocket.OPEN) {
          console.error('Twilio WebSocket not open, cannot send audio, state:', session.twilioWs.readyState);
          break;
        }

        // Track start timestamp for new responses
        if (event.item_id && event.item_id !== session.lastAssistantItem) {
          session.responseStartTimestampTwilio = session.latestMediaTimestamp;
          session.lastAssistantItem = event.item_id;
          console.log(`New response started at timestamp: ${session.responseStartTimestampTwilio}ms`);

          // Track audio chunk count for this response
          if (!session.audioChunkCount) {
            session.audioChunkCount = 0;
          }
          session.audioChunkCount = 0;
        }

        session.audioChunkCount = (session.audioChunkCount || 0) + 1;

        // Log first few chunks
        if (session.audioChunkCount <= 3) {
          console.log(`Sending audio chunk ${session.audioChunkCount} to Twilio, delta length: ${event.delta.length}`);
        }

        // Normalize base64 encoding (decode then re-encode)
        // OpenAI sends base64, but we need to normalize it for Twilio
        const audioPayload = Buffer.from(event.delta, 'base64').toString('base64');

        console.log('[AUDIO DEBUG] Sending audio to Twilio, payload length:', audioPayload.length);

        // Send audio to Twilio
        try {
          session.twilioWs.send(JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: {
              payload: audioPayload
            }
          }));
          console.log('[AUDIO DEBUG] ✅ Audio sent successfully to Twilio');
        } catch (error) {
          console.error('[AUDIO DEBUG] ❌ Error sending audio to Twilio:', error.message);
        }

        // Send mark to track playback
        if (session.streamSid) {
          session.twilioWs.send(JSON.stringify({
            event: 'mark',
            streamSid: session.streamSid,
            mark: { name: 'responsePart' }
          }));
          session.markQueue.push('responsePart');
        }
        break;

      case 'input_audio_buffer.speech_started':
        // Handle interruption when user starts speaking
        console.log('Speech started detected - handling interruption');

        // Only interrupt if audio has actually started playing
        if (session.markQueue.length > 0 && session.responseStartTimestampTwilio !== null) {
          const elapsedTime = session.latestMediaTimestamp - session.responseStartTimestampTwilio;
          console.log(`Interrupting response at ${elapsedTime}ms`);

          if (session.lastAssistantItem) {
            // Send truncate event to OpenAI with proper timing
            session.openAIWs.send(JSON.stringify({
              type: 'conversation.item.truncate',
              item_id: session.lastAssistantItem,
              content_index: 0,
              audio_end_ms: elapsedTime
            }));
          }

          // Clear Twilio's audio buffer
          if (session.twilioWs.readyState === WebSocket.OPEN && session.streamSid) {
            session.twilioWs.send(JSON.stringify({
              event: 'clear',
              streamSid: session.streamSid
            }));
          }

          // Reset tracking
          session.markQueue = [];
          session.lastAssistantItem = null;
          session.responseStartTimestampTwilio = null;
        }
        break;

      case 'response.output_audio_transcript.delta':
        // AI's speech transcribed (partial)
        break;

      case 'response.output_audio_transcript.done':
        // AI's complete response (GA format)
        const aiTranscript = event.transcript;
        console.log('AI said:', aiTranscript);
        session.transcript += `Assistant: ${aiTranscript}\n`;
        break;

      case 'response.function_call_arguments.done':
        // Function call completed
        const functionName = event.name;
        const args = JSON.parse(event.arguments);
        console.log('Function call:', functionName, args);

        // Execute function
        const aiService = require('./aiService');
        const result = await aiService.executeFunctionCall(session.userId, functionName, args);

        // Send result back to OpenAI
        session.openAIWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: event.call_id,
            output: JSON.stringify(result)
          }
        }));
        break;

      case 'error':
        console.error('OpenAI error:', event.error);
        break;
    }
  }

  /**
   * Get voice-specific instructions for OpenAI
   */
  getVoiceInstructions(user) {
    return `You are ${user.name}'s personal life assistant speaking on a phone call.

Guidelines:
1. Be conversational and natural - you're talking, not texting
2. Keep responses concise but warm
3. Use natural speech patterns (um, well, etc. sparingly)
4. Listen actively and ask follow-up questions
5. Help ${user.name} reflect, plan, and track their life

Core capabilities:
- Help create and manage tasks
- Track habits and celebrate streaks
- Set and monitor goals
- Daily reflections and check-ins
- Provide accountability and support

User context:
- Name: ${user.name || 'Friend'}
- Timezone: ${user.timezone || 'America/New_York'}
- Personality preference: ${user.ai_context?.personality || 'supportive and motivational'}

Current time: ${new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' })}

Be helpful, supportive, and genuinely engaged in the conversation.`;
  }

  /**
   * Get function tools for voice calls
   * Converts Chat Completions format to Realtime API format
   */
  getVoiceTools() {
    const aiService = require('./aiService');
    const chatTools = aiService.getFunctionTools();

    // Realtime API expects just the function definitions, not wrapped in {type: 'function', function: {...}}
    return chatTools.map(tool => tool.function);
  }

  /**
   * Initiate outbound call for reflection
   */
  async initiateReflectionCall(userId) {
    const twilioService = require('./twilioService');
    const user = await User.findById(userId);

    if (!user) throw new Error('User not found');

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/outbound-reflection?userId=${userId}`;

    await twilioService.makeCall(user.phone, webhookUrl);
    console.log(`Initiated reflection call to ${user.name}`);
  }
}

module.exports = new VoiceService();
