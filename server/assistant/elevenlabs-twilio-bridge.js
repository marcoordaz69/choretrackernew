/**
 * ElevenLabs + Twilio WebSocket Bridge
 *
 * Simple bridge to connect Twilio phone calls to ElevenLabs Conversational AI
 * No dashboard setup required - everything via API!
 */

const express = require('express');
const expressWs = require('express-ws');
const WebSocket = require('ws');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

// Configuration
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

/**
 * Get signed URL for ElevenLabs conversation
 */
async function getElevenLabsSignedUrl(agentId) {
  const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get signed URL: ${response.statusText}`);
  }

  const data = await response.json();
  return data.signed_url;
}

/**
 * Setup routes for Twilio integration
 */
function setupElevenLabsRoutes(app) {
  console.log('[ElevenLabs Bridge] setupElevenLabsRoutes called');
  console.log('[ElevenLabs Bridge] app type:', typeof app);
  console.log('[ElevenLabs Bridge] app.post exists:', typeof app.post);
  console.log('[ElevenLabs Bridge] app.ws exists:', typeof app.ws);

  /**
   * POST /elevenlabs/call/incoming
   * Handle incoming Twilio call - return TwiML to stream audio
   */
  console.log('[ElevenLabs Bridge] Setting up POST /elevenlabs/call/incoming');
  app.post('/elevenlabs/call/incoming', (req, res) => {
    console.log('[ElevenLabs] Incoming call from:', req.body.From);
    console.log('[ElevenLabs] Request host:', req.headers.host);

    const response = new VoiceResponse();

    // Use <Start> instead of <Connect> to keep call alive while streaming
    const start = response.start();

    // Stream audio to our WebSocket endpoint (bidirectional)
    const streamUrl = `wss://${req.headers.host}/elevenlabs/media-stream`;
    console.log('[ElevenLabs] Stream URL:', streamUrl);

    start.stream({
      url: streamUrl,
      track: 'both_tracks'  // Enable both inbound AND outbound audio
    });

    // Add a long pause to keep the call alive while streaming
    // The stream will handle the actual conversation
    response.pause({ length: 3600 }); // 1 hour pause (max call duration)

    const twiml = response.toString();
    console.log('[ElevenLabs] TwiML response:', twiml);

    res.type('text/xml');
    res.send(twiml);
  });

  /**
   * WebSocket /elevenlabs/media-stream
   * Bridge between Twilio and ElevenLabs
   */
  console.log('[ElevenLabs Bridge] Setting up WS /elevenlabs/media-stream');
  app.ws('/elevenlabs/media-stream', async (twilioWs, req) => {
    console.log('[ElevenLabs] ===== WebSocket connection established =====');
    console.log('[ElevenLabs] Client IP:', req.connection.remoteAddress);
    console.log('[ElevenLabs] Request headers:', req.headers);

    let elevenLabsWs;
    let streamSid = null;

    try {
      // Get signed URL and connect to ElevenLabs IMMEDIATELY
      const signedUrl = await getElevenLabsSignedUrl(ELEVENLABS_AGENT_ID);
      console.log('[ElevenLabs] Got signed URL, connecting to ElevenLabs...');

      // Connect to ElevenLabs right away
      elevenLabsWs = new WebSocket(signedUrl);

      // ElevenLabs → Twilio: Forward audio responses
      elevenLabsWs.on('message', (data) => {
        try {
          const message = JSON.parse(data);

          // Handle different ElevenLabs event types
          switch (message.type) {
            case 'audio':
              // Forward audio chunk to Twilio
              console.log('[ElevenLabs] Audio event received, payload length:', message.audio_event?.audio_base_64?.length || 0);
              console.log('[ElevenLabs] streamSid:', streamSid, 'twilioWs ready:', twilioWs.readyState === WebSocket.OPEN);

              if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
                const audioMessage = {
                  event: 'media',
                  streamSid: streamSid,
                  media: {
                    payload: message.audio_event.audio_base_64
                  }
                };
                twilioWs.send(JSON.stringify(audioMessage));
                console.log('[ElevenLabs] Audio sent to Twilio');
              } else {
                console.log('[ElevenLabs] Cannot send audio - streamSid:', streamSid, 'wsReady:', twilioWs.readyState === WebSocket.OPEN);
              }
              break;

            case 'interruption':
              // Clear Twilio's audio buffer when user interrupts
              if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
                twilioWs.send(JSON.stringify({
                  event: 'clear',
                  streamSid: streamSid
                }));
              }
              break;

            case 'agent_response':
              console.log('[ElevenLabs] Agent:', message.agent_response_event.agent_response);
              break;

            case 'user_transcript':
              console.log('[ElevenLabs] User:', message.user_transcription_event.user_transcript);
              break;

            case 'ping':
              // Respond to keepalive
              if (elevenLabsWs.readyState === WebSocket.OPEN) {
                elevenLabsWs.send(JSON.stringify({
                  type: 'pong',
                  event_id: message.ping_event.event_id
                }));
              }
              break;
          }
        } catch (error) {
          console.error('[ElevenLabs] Error processing message:', error);
        }
      });

      elevenLabsWs.on('open', () => {
        console.log('[ElevenLabs] Connected to ElevenLabs');
      });

      elevenLabsWs.on('error', (error) => {
        console.error('[ElevenLabs] WebSocket error:', error);
      });

      elevenLabsWs.on('close', () => {
        console.log('[ElevenLabs] Disconnected from ElevenLabs');
      });

      // Track if this is the first message to debug streamSid issue
      let messageCount = 0;

      // Twilio → ElevenLabs: Forward user audio
      twilioWs.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          messageCount++;

          // Log first 5 messages in FULL to debug streamSid issue
          if (messageCount <= 5) {
            console.log(`[Twilio] Message #${messageCount} FULL:`, JSON.stringify(msg, null, 2));
          } else {
            console.log('[Twilio] Received event:', msg.event);
          }

          switch (msg.event) {
            case 'connected':
              console.log('[Twilio] Connected event received');
              break;

            case 'start':
              streamSid = msg.start.streamSid;
              console.log('[Twilio] Stream started:', streamSid);
              console.log('[Twilio] Stream config:', JSON.stringify(msg.start, null, 2));
              break;

            case 'media':
              // Get streamSid from media message (when using <Start> TwiML)
              if (!streamSid && msg.streamSid) {
                streamSid = msg.streamSid;
                console.log('[Twilio] Got streamSid from media event:', streamSid);
              }

              // Forward audio to ElevenLabs (only if connected)
              if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
                elevenLabsWs.send(JSON.stringify({
                  user_audio_chunk: Buffer.from(msg.media.payload, 'base64').toString('base64')
                }));
              }
              break;

            case 'stop':
              console.log('[Twilio] Stream stopped');
              if (elevenLabsWs) {
                elevenLabsWs.close();
              }
              break;

            default:
              console.log('[Twilio] Unhandled event:', msg.event, JSON.stringify(msg).substring(0, 200));
          }
        } catch (error) {
          console.error('[Twilio] Error processing message:', error);
        }
      });

      twilioWs.on('close', () => {
        console.log('[Twilio] WebSocket closed');
        if (elevenLabsWs) {
          elevenLabsWs.close();
        }
      });

      twilioWs.on('error', (error) => {
        console.error('[Twilio] WebSocket error:', error);
      });

    } catch (error) {
      console.error('[ElevenLabs] Error initializing conversation:', error);
      if (elevenLabsWs) {
        elevenLabsWs.close();
      }
      twilioWs.close();
    }
  });

  // Test endpoint to verify WebSocket is working
  app.get('/elevenlabs/ws-test', (req, res) => {
    res.send(`
      <html>
        <body>
          <h1>WebSocket Test</h1>
          <div id="status">Connecting...</div>
          <script>
            const ws = new WebSocket('wss://${req.headers.host}/elevenlabs/media-stream');
            const status = document.getElementById('status');

            ws.onopen = () => {
              status.textContent = 'Connected! WebSocket is working.';
              status.style.color = 'green';
            };

            ws.onerror = (error) => {
              status.textContent = 'Error: ' + error;
              status.style.color = 'red';
            };

            ws.onclose = () => {
              status.textContent = 'Closed';
              status.style.color = 'orange';
            };
          </script>
        </body>
      </html>
    `);
  });

  console.log('[ElevenLabs] Routes configured:');
  console.log('  - POST /elevenlabs/call/incoming (Twilio webhook)');
  console.log('  - WS /elevenlabs/media-stream (Audio bridge)');
  console.log('  - GET /elevenlabs/ws-test (WebSocket test page)');
}

module.exports = {
  setupElevenLabsRoutes,
  getElevenLabsSignedUrl
};
