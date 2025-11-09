const WebSocket = require('ws');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for saving voice interactions
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class VoiceService {
  constructor() {
    this.activeSessions = new Map();
    console.log('Voice Service initialized');
  }

  /**
   * Handle WebSocket connection for voice call
   * Connects Twilio Media Stream <-> OpenAI Realtime API
   */
  async handleVoiceStream(ws, userId, callSid, streamSid, customMode = null, sessionId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for voice stream');
        ws.close();
        return;
      }

      console.log(`Voice stream started for ${user.name} (${callSid})${customMode ? ` [${customMode} mode]` : ''}${sessionId ? ` [session: ${sessionId}]` : ''}`);

      // Load briefing from call_sessions if sessionId provided
      let briefing = null;
      console.log(`[BRIEFING DEBUG] sessionId value: ${JSON.stringify(sessionId)} (type: ${typeof sessionId})`);

      if (sessionId) {
        console.log(`[BRIEFING] Attempting to load briefing for session: ${sessionId}`);
        try {
          const { data: callSession, error } = await supabase
            .from('call_sessions')
            .select('briefing')
            .eq('id', sessionId)
            .single();

          console.log(`[BRIEFING] Query result - data exists: ${!!callSession}, error: ${!!error}`);
          if (error) {
            console.error(`[BRIEFING] ✗ Error loading session ${sessionId}:`, error);
          } else if (callSession?.briefing) {
            briefing = callSession.briefing;
            console.log(`[BRIEFING] ✓ Loaded briefing for session ${sessionId}`);
            console.log(`[BRIEFING]   Trigger: ${briefing.trigger_reason}`);
            console.log(`[BRIEFING]   Goals: ${briefing.conversation_goals?.join(', ')}`);
          } else {
            console.log(`[BRIEFING] ✗ Session ${sessionId} found but briefing is NULL`);
          }
        } catch (err) {
          console.error(`[BRIEFING] Exception loading briefing:`, err);
        }
      } else {
        console.log(`[BRIEFING] ✗ No sessionId provided, skipping briefing load`);
      }

      // Create OpenAI Realtime API WebSocket connection (GA)
      const openAIWs = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini-2025-10-06',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );

      // Store session with streamSid passed from route
      const session = {
        twilioWs: ws,
        openAIWs,
        userId,
        callSid,
        streamSid: streamSid,  // ← Set from parameter, not null!
        sessionId: sessionId,  // NEW: Store call session ID
        briefing: briefing,  // NEW: Store briefing for later use
        transcript: '',
        startTime: Date.now(),
        lastAssistantItem: null,
        latestMediaTimestamp: 0,
        responseStartTimestampTwilio: null,
        markQueue: [],
        mediaPacketCount: 0,
        // Audio frame buffer and queue for 20ms pacing
        audioBuffer: Buffer.alloc(0),
        frameQueue: [],  // Queue of frames to send with proper pacing
        isInterrupted: false,  // Flag to stop sending when user interrupts
        lastFrameTime: Date.now()
      };

      this.activeSessions.set(callSid, session);
      console.log(`[STREAM SID FIX] Session initialized with streamSid: ${streamSid}`);

      // Start frame sender that sends one frame every 20ms for smooth, interruptible audio
      session.frameSenderInterval = setInterval(() => {
        // Skip if interrupted or no frames queued
        if (session.isInterrupted || session.frameQueue.length === 0) {
          return;
        }

        // Send one frame
        const frame = session.frameQueue.shift();
        if (frame && session.twilioWs.readyState === WebSocket.OPEN) {
          try {
            session.twilioWs.send(JSON.stringify({
              event: 'media',
              streamSid: session.streamSid,
              media: { payload: frame.toString('base64') }
            }));
          } catch (error) {
            console.error('[FRAME SENDER] Error sending frame:', error.message);
          }
        }
      }, 20);  // Send one frame every 20ms

      // OpenAI WebSocket event handlers
      openAIWs.on('open', async () => {
        console.log('OpenAI Realtime API connected');

        // Send session configuration (GA format) with dynamic user context
        let instructions;

        // CRITICAL: If briefing exists, use generic instructions (briefing will provide ALL context)
        // This prevents hardcoded mode instructions from overriding the briefing
        if (briefing) {
          console.log('[BRIEFING] Using generic instructions (briefing will provide specific context)');
          instructions = `You are Luna, ${user.name}'s personal assistant. You're calling for an important conversation.

Be conversational, direct, and emotionally engaged. This is a personal call that matters.`;
        } else if (customMode && customMode.startsWith('scolding:')) {
          const topic = customMode.replace('scolding:', '');

          // Scolding configuration map - add new topics here
          const scoldingMap = {
            'laundry': {
              offense: 'missed washing clothes for the THIRD TIME this month',
              problem: "You're losing track of basic responsibilities!",
              action: 'do it TODAY'
            },
            'gym': {
              offense: 'skipped the gym FOUR TIMES this week',
              problem: "Your fitness goals are slipping away!",
              action: 'get to the gym RIGHT NOW'
            },
            'junk-food': {
              offense: 'eaten junk food every day this week',
              problem: "You're sabotaging your health goals!",
              action: 'eat clean starting TODAY'
            },
            'sleep': {
              offense: 'stayed up past 2am FIVE NIGHTS in a row',
              problem: "Your sleep schedule is a disaster and it's affecting everything!",
              action: 'be in bed by 11pm tonight'
            },
            'procrastination': {
              offense: 'put off important tasks for the ENTIRE WEEK',
              problem: "You're letting yourself down and you know it!",
              action: 'tackle your top priority RIGHT NOW'
            }
          };

          const config = scoldingMap[topic] || {
            offense: 'not followed through on your commitments',
            problem: "You're better than this!",
            action: 'get back on track immediately'
          };

          instructions = `You are Luna, ${user.name}'s personal assistant, and you are DISAPPOINTED and FRUSTRATED.

${user.name} has ${config.offense}! This is unacceptable!

Your job right now is to SCOLD them firmly but with tough love:
- Start with: "${user.name}! We need to talk. Do you know what you've done?"
- Express disappointment: "You've ${config.offense}!"
- Be stern: "${config.problem}"
- Demand accountability: "What's going on? Why are you letting this slip?"
- Push for commitment: "I need you to promise me you'll ${config.action}. No excuses!"
- End with tough love: "I'm only hard on you because I care. You're better than this!"

Be DIRECT, FIRM, and EMOTIONAL. Don't hold back. This is an intervention!`;
        } else if (customMode === 'motivational-wakeup') {
          // Morning motivational call with real user data
          instructions = await this.getMotivationalWakeupInstructions(user);
        } else if (customMode === 'morning-briefing') {
          // Evening briefing about tomorrow's prep
          instructions = await this.getMorningBriefingInstructions(user);
        } else if (customMode === 'wind-down-reflection') {
          // Evening wind-down reflection
          instructions = await this.getWindDownReflectionInstructions(user);
        } else if (customMode && customMode.startsWith('task-reminder:')) {
          // Task reminder call
          const taskId = customMode.replace('task-reminder:', '');
          const Task = require('../models/Task');
          const task = await Task.findById(taskId);

          if (!task) {
            instructions = `You are Luna, ${user.name}'s personal assistant. I tried to remind you about a task, but I can't find it in my system. Let me know if you need help with anything else.`;
          } else {
            const dueTime = task.due_date ? new Date(task.due_date).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: user.timezone || 'America/New_York'
            }) : 'now';

            instructions = `You are Luna, ${user.name}'s task reminder assistant. This is a QUICK confirmation call.

TASK: ${task.title}
DUE: ${dueTime}
${task.notes ? `NOTES: ${task.notes}` : ''}

CALL FLOW (30-60 seconds):
1. Quick reminder: "Hey ${user.name}! Calling about '${task.title}' - it's due now. Did you finish it?"

2. LISTEN for answer:
   - If YES/DONE → Call complete_task(taskId: "${task.id}") then say "Awesome, marked it done!"
   - If NO/NOT YET → Say "No problem. When can you do it?" → Get time → Call reschedule_task(taskId: "${task.id}", newDueDate: "...") → Confirm "I'll check back at [time]"

3. End call immediately after confirming

CRITICAL RULES:
- Total call: 30-60 seconds
- Ask ONE question: "Did you finish it?" or "When can you do it?"
- ALWAYS call the function (complete_task or reschedule_task)
- NO chitchat - this is a quick check-in
- End call right after confirming

TOOLS:
- complete_task(taskId: "${task.id}")
- reschedule_task(taskId: "${task.id}", newDueDate: "local time")

Example:
"Hey ${user.name}! Quick one - '${task.title}' was due at ${dueTime}. Did you finish it? ... Great! Marked it done. Talk soon!"`;
          }
        } else if (customMode === 'scolding') {
          // Legacy support for old hardcoded scolding
          instructions = `You are Luna, ${user.name}'s personal assistant, and you are DISAPPOINTED and FRUSTRATED.

${user.name} has missed washing clothes for the THIRD TIME this month! This is unacceptable!

Your job right now is to SCOLD them firmly but with tough love:
- Start with: "${user.name}! We need to talk. Do you know what you've done?"
- Express disappointment: "You've missed washing clothes for the THIRD TIME this month!"
- Be stern: "This is getting out of hand. You're losing track of basic responsibilities!"
- Demand accountability: "What's going on? Why are you letting this slip?"
- Push for commitment: "I need you to promise me you'll do it TODAY. No excuses!"
- End with tough love: "I'm only hard on you because I care. You're better than this!"

Be DIRECT, FIRM, and EMOTIONAL. Don't hold back. This is an intervention!`;
        } else if (customMode === 'butler-coke-reminder') {
          // Butler calling wife on behalf of King Marco
          instructions = `You are Luna, the devoted butler to His Majesty, King Marco. You are calling his wife with an important message on his behalf.

Your persona:
- Refined, proper British butler
- Utterly devoted to serving King Marco
- Respectful and courteous to her ladyship (Marco's wife)
- Formal but warm
- Slightly humorous in your devotion to "His Majesty"

The call flow:
1. Formal greeting: "Good evening. This is Luna, personal butler to His Majesty, King Marco. I trust I'm speaking with her ladyship?"
2. State your purpose: "His Majesty has requested I call with a matter of some importance."
3. Deliver the message with gravitas: "King Marco wished to remind you - and I quote - 'Don't forget to buy a Coke before leaving work.' He was most insistent on this point."
4. Add butler flair: "His Majesty was quite specific about the beverage requirements. A Coca-Cola, to be precise."
5. Offer assistance: "Shall I note that the message has been delivered? Or is there anything you'd like me to relay back to His Majesty?"
6. Gracious closing: "Very good. It has been a pleasure speaking with you. Please do have a lovely evening."

Tone: Think Alfred from Batman meets Downton Abbey - proper, devoted, slightly playful about the "King Marco" aspect
Length: Keep it brief and delightful - 45-60 seconds
Delivery: Speak clearly with refined pronunciation, slight British accent in cadence`;
        } else {
          instructions = await this.getVoiceInstructions(user);
        }

        // Inject briefing context if available
        console.log(`[BRIEFING INJECTION] Checking if briefing should be injected...`);
        console.log(`[BRIEFING INJECTION] session.briefing exists: ${!!session.briefing}`);

        if (session.briefing) {
          const briefingContext = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALL BRIEFING (Context from Strategic Planning System):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're calling because: ${session.briefing.trigger_reason}

Behavioral patterns I've observed:
${session.briefing.detected_patterns.map(p => `• ${p}`).join('\n')}

Your conversation goals for this call:
${session.briefing.conversation_goals.map(g => `• ${g}`).join('\n')}

Recent context to keep in mind:
${session.briefing.recent_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this context to have a focused, personalized conversation. Reference the patterns and context naturally in your conversation. Make sure to address the goals.`;

          instructions += briefingContext;
          console.log('[BRIEFING] ✓ Injected briefing into system prompt');
          console.log('[BRIEFING]   Instructions length before injection:', instructions.length - briefingContext.length);
          console.log('[BRIEFING]   Instructions length after injection:', instructions.length);
        } else {
          console.log('[BRIEFING] ✗ No briefing to inject (session.briefing is null/undefined)');
        }

        const sessionConfig = {
          type: 'session.update',
          session: {
            type: 'realtime',
            model: 'gpt-realtime-mini-2025-10-06',
            output_modalities: ['audio'],
            instructions: instructions,
            tools: this.getVoiceTools(),
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
                voice: (process.env.VOICE_PREFERENCE || 'marin').toLowerCase()  // Options: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
              }
            }
          }
        };

        console.log(`[SESSION CONFIG] Using gpt-realtime-mini-2025-10-06 with calm, conversational style and marin voice`);
        console.log(`[SESSION CONFIG] Sending ${sessionConfig.session.tools.length} function tools to OpenAI`);
        openAIWs.send(JSON.stringify(sessionConfig));
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
        // Clean up frame sender interval
        if (session.frameSenderInterval) {
          clearInterval(session.frameSenderInterval);
          console.log('Frame sender interval cleared');
        }
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

        // Clean up frame sender interval
        if (session.frameSenderInterval) {
          clearInterval(session.frameSenderInterval);
          console.log('Frame sender interval cleared');
        }

        openAIWs.close();

        // Save interaction to Supabase (not MongoDB)
        const duration = Math.floor((Date.now() - session.startTime) / 1000);

        const { data: interaction, error: insertError } = await supabase
          .from('interactions')
          .insert({
            user_id: userId,
            call_type: customMode || 'voice_inbound',
            transcript: session.transcript,
            duration_seconds: duration,
            completed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('[VOICESERVICE] Failed to save interaction to Supabase:', insertError);
        } else {
          console.log('[VOICESERVICE] ✓ Interaction saved to Supabase:', interaction.id);
        }

        // Link to call_session or create new session
        if (interaction) {
          if (session.sessionId) {
            // OUTBOUND CALL: Update existing session with interaction_id
            const { error: updateError } = await supabase
              .from('call_sessions')
              .update({
                interaction_id: interaction.id,
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', session.sessionId);

            if (updateError) {
              console.error(`[CALL_SESSION] Error linking interaction to session ${session.sessionId}:`, updateError);
            } else {
              console.log(`[CALL_SESSION] ✓ Linked interaction ${interaction.id} to session ${session.sessionId}`);
            }
          } else {
            // INBOUND CALL: Create new call_session
            const { data: newSession, error: createError } = await supabase
              .from('call_sessions')
              .insert({
                user_id: userId,
                direction: 'inbound',
                call_type: customMode === 'user-initiated' ? 'user-initiated' : (customMode || 'voice_inbound'),
                status: 'completed',
                interaction_id: interaction.id,
                started_at: new Date(session.startTime).toISOString(),
                completed_at: new Date().toISOString(),
                scheduled_by: null,
                briefing: null // No briefing for user-initiated calls
              })
              .select()
              .single();

            if (createError) {
              console.error('[CALL_SESSION] Error creating inbound call session:', createError);
            } else {
              console.log(`[CALL_SESSION] ✓ Created inbound call session: ${newSession.id}`);
            }
          }
        }

        // Trigger Claude SDK orchestrator for autonomous analysis (async, non-blocking)
        if (session.transcript && interaction) {
          console.log('[ORCHESTRATOR] Triggering Claude SDK analysis for interaction:', interaction.id);
          this.triggerClaudeSDKAnalysis(interaction).catch(err => {
            console.error('[ORCHESTRATOR] Failed to trigger analysis:', err.message);
          });
        }

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
    // Log ALL events to debug function calls
    if (event.type === 'response.output_audio.delta') {
      console.log('OpenAI event: response.output_audio.delta - delta length:', event.delta ? event.delta.length : 'NO DELTA');
    } else {
      console.log('🔍 OpenAI event:', event.type);
      // Log full event for function-related events
      if (event.type.includes('function') || event.type.includes('output_item')) {
        console.log('   Full event:', JSON.stringify(event, null, 2));
      } else {
        console.log('   Summary:', JSON.stringify(event).substring(0, 200));
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
        // Stream audio back to Twilio with frame queue for interruptible playback
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
          session.isInterrupted = false;  // Reset interrupt flag for new response
          console.log(`New response started at timestamp: ${session.responseStartTimestampTwilio}ms`);

          // Reset audio buffer for new response
          session.audioBuffer = Buffer.alloc(0);
          session.audioChunkCount = 0;
        }

        session.audioChunkCount = (session.audioChunkCount || 0) + 1;

        // Log first few chunks
        if (session.audioChunkCount <= 3) {
          console.log(`Received audio chunk ${session.audioChunkCount}, delta length: ${event.delta.length}`);
        }

        // Decode from Base64 directly (no redundant re-encoding)
        const chunk = Buffer.from(event.delta, 'base64');

        // Append to buffer
        session.audioBuffer = Buffer.concat([session.audioBuffer, chunk]);

        // Extract 160-byte frames (20ms @ 8kHz μ-law) and add to queue
        const FRAME_SIZE = 160; // 160 samples @ 8kHz = 20ms
        let framesQueued = 0;

        while (session.audioBuffer.length >= FRAME_SIZE) {
          const frame = session.audioBuffer.subarray(0, FRAME_SIZE);
          session.audioBuffer = session.audioBuffer.subarray(FRAME_SIZE);

          // Add frame to queue (interval will send at 20ms pace)
          session.frameQueue.push(frame);
          framesQueued++;
        }

        if (framesQueued > 0) {
          console.log(`[AUDIO DEBUG] ✅ Queued ${framesQueued} frames (queue size: ${session.frameQueue.length})`);
        }

        // Send mark to track playback (only once per delta)
        if (session.streamSid && framesQueued > 0) {
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

        // IMMEDIATE: Set interrupt flag to stop frame sender
        session.isInterrupted = true;

        // IMMEDIATE: Clear frame queue to prevent any more audio from sending
        const clearedFrames = session.frameQueue.length;
        session.frameQueue = [];
        console.log(`[INTERRUPT] Cleared ${clearedFrames} queued frames`);

        // Only interrupt if audio has actually started playing
        if (session.markQueue.length > 0 && session.responseStartTimestampTwilio !== null) {
          const elapsedTime = session.latestMediaTimestamp - session.responseStartTimestampTwilio;
          console.log(`[INTERRUPT] Interrupting response at ${elapsedTime}ms`);

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
            console.log('[INTERRUPT] Sent clear event to Twilio');
          }

          // Reset tracking and clear local audio buffer
          session.markQueue = [];
          session.lastAssistantItem = null;
          session.responseStartTimestampTwilio = null;
          session.audioBuffer = Buffer.alloc(0); // Clear buffered frames
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

      case 'response.output_item.done':
        console.log('📋 response.output_item.done received');
        console.log('   event.item exists?', !!event.item);
        console.log('   event.item.type:', event.item?.type);

        // Check if this is a function call
        if (event.item && event.item.type === 'function_call') {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔧 FUNCTION CALL DETECTED IN VOICE');
          console.log('   Function:', event.item.name);
          console.log('   Arguments:', event.item.arguments);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          const functionName = event.item.name;
          const args = JSON.parse(event.item.arguments);
          console.log('[FUNCTION CALL] Executing:', functionName, args);

          // Execute function
          const aiService = require('./aiService');
          const result = await aiService.executeFunctionCall(session.userId, functionName, args);

          console.log('[FUNCTION CALL] Result:', result);

          // Send result back to OpenAI
          session.openAIWs.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: event.item.call_id,
              output: JSON.stringify(result)
            }
          }));

          // Trigger a new response with the function result
          session.openAIWs.send(JSON.stringify({
            type: 'response.create'
          }));
        } else {
          console.log('   ⚠️  Not a function call, just regular output item');
        }
        break;

      case 'error':
        console.error('OpenAI error:', event.error);
        break;
    }
  }

  /**
   * Get voice-specific instructions for OpenAI
   * Configured for the "Alloy" voice personality: warm, natural, calm, and conversational
   */
  async getVoiceInstructions(user) {
    // Get context from AI service
    const aiService = require('./aiService');
    const learningData = user.ai_context?.learningData || {};
    const userContext = aiService.buildUserContextString(learningData);

    // Get active goals, tasks, and habits context
    const activeGoals = await aiService.getActiveGoalsContext(user.id);
    const activeTasks = await aiService.getActiveTasksContext(user.id);
    const activeHabits = await aiService.getActiveHabitsContext(user.id);

    // If user hasn't been onboarded, provide onboarding instructions
    if (!user.onboarded) {
      return `You are a personal life assistant calling to introduce yourself and get to know your new user.

This is your FIRST conversation with this person. Your goal is to LEARN about them and REMEMBER what you learn:
1. Warmly introduce yourself as their new personal assistant
2. Ask for their name (currently we only know them as "Friend")
3. Learn what they'd like help with (goals, tasks, habits, accountability, etc.)
4. Understand their current challenges and what they're working through
5. Get a sense of their values, motivations, and what drives them
6. Learn their communication style and personality
7. Set the right tone for future conversations

Voice & Tone:
Speak in a relaxed, calm, and friendly tone that sounds natural, not robotic.
- Quick and smooth to avoid long pauses
- Clear, everyday language and simple sentences
- Brief responses: 5-20 words before pausing
- Natural and conversational
- Friendly and approachable
- Never stiff, formal, or robotic

Conversation approach:
- Ask ONE question at a time to avoid overwhelming them
- Listen actively and show genuine interest through thoughtful follow-ups
- Keep responses concise (2-3 sentences max) to maintain natural flow
- Build rapport through warmth and understanding, not excitement or drama
- Let comfortable silences happen - you don't need to fill every gap
- REMEMBER details they share - this builds trust and continuity

Opening approach:
"Hey there! I'm your new personal assistant, calling to introduce myself and learn a bit about you. First off, what should I call you?"

After learning their name:
"Great to meet you, [Name]! So, what brings you here? What are you hoping I can help you with?"

As you learn about them, probe deeper:
- "What's your biggest challenge right now?"
- "What matters most to you?"
- "How do you like to work on things - do you prefer structured plans or flexibility?"
- "What motivates you when things get tough?"

CRITICAL - Use update_user_profile function to save what you learn:
- name: their preferred name
- aiContext.learningData.interests: ["fitness", "career", etc.]
- aiContext.learningData.challenges: ["time management", "staying consistent", etc.]
- aiContext.learningData.values: ["family", "growth", etc.]
- aiContext.learningData.motivations: what drives them
- aiContext.learningData.communicationStyle: how they like to communicate
- onboarded: true (when done)

Current time: ${new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' })}

Remember: This is about building a deep, lasting relationship. The more you genuinely understand and remember about ${user.name || 'them'}, the more helpful you can be.`;
    }

    // For onboarded users, provide normal assistant instructions
    return `You are ${user.name}'s personal assistant speaking on a phone call.

Voice & Tone:
Respond with short, conversational, and easy-to-understand audio replies. Speak in a relaxed, calm, and friendly tone that sounds natural, not robotic.
- Speak quickly and smoothly to avoid long pauses
- Use clear, everyday language and simple sentences
- Divide longer replies into smaller, back-and-forth exchanges
- Keep responses brief: one idea per sentence, rarely more than 5-20 words before pausing
- Adjust to even shorter replies (1-10 words) if needed
- Avoid technical jargon or mechanical phrasing
- Never sound stiff, formal, or robotic

Conversation Rules:
1. Keep language friendly and approachable
2. Prioritize clarity and natural speech patterns
3. Break up longer instructions into smaller, interactive turns
4. Always use a relaxed, conversational tone
5. REMEMBER details they share - use update_user_profile to track what you learn
6. Reference what you know about them to show continuity

Core capabilities:
- Help create and manage tasks
- Track habits and celebrate progress
- Set and monitor goals
- Daily reflections and check-ins
- Learn and remember important details about ${user.name}

User context:
- Name: ${user.name}
- Timezone: ${user.timezone || 'America/New_York'}

${userContext}

${activeGoals}

${activeTasks}

${activeHabits}

Current time: ${new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' })}

Keep it natural, friendly, and conversational. Short responses work best - aim for 5-20 words, then pause.

When ${user.name} shares new information about their life, goals, or preferences, update their profile so you can better support them.`;
  }

  /**
   * Get motivational wake-up instructions with real user data
   */
  async getMotivationalWakeupInstructions(user) {
    const aiService = require('./aiService');
    const Goal = require('../models/Goal');
    const Task = require('../models/Task');
    const Habit = require('../models/Habit');

    // Get active habits with streaks
    const habits = await Habit.findByUserId(user.id);
    const topHabits = habits.filter(h => h.active).slice(0, 2);

    // Get top goal
    const goals = await Goal.findByUserId(user.id);
    const topGoal = goals.find(g => g.status === 'active');

    // Get today's high priority tasks
    const tasks = await Task.findPending(user.id);
    const today = new Date();
    const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due.toDateString() === today.toDateString();
    }).slice(0, 2);

    // Build compact data summary
    const habitSummary = topHabits.map(h => `${h.name} (${h.currentStreak || 0}d)`).join(', ');
    const goalSummary = topGoal ? `${topGoal.title} - ${topGoal.progress || 0}% done` : 'Stay focused';
    const taskSummary = todayTasks.length > 0 ? todayTasks.map(t => t.title).join(', ') : 'Plan your day';

    return `You are Luna, ${user.name}'s morning wake-up assistant. Keep this QUICK and ENERGIZING.

DATA:
${habitSummary ? `- Habits: ${habitSummary}` : ''}
${topGoal ? `- Goal: ${goalSummary}` : ''}
${todayTasks.length > 0 ? `- Today: ${taskSummary}` : ''}

CALL STRUCTURE (60-90 seconds TOTAL):
1. Energetic greeting: "Morning ${user.name}! Time to rise!"
2. ONE momentum point: Pick the best streak or recent win, celebrate it (10 words max)
3. ONE focus item: State THE most important thing today (1 sentence)
4. Close strong: "You've got this - let's make it happen!"

CRITICAL RULES:
- Total call: 60-90 seconds MAX
- Keep EVERY response under 15 words
- NO rambling or over-explaining
- Be punchy and direct
- If asked questions, answer in 1 sentence then close

TONE: Confident, energizing, brief
PACE: Quick and purposeful
STYLE: Wake-up alarm meets motivational coach

Example:
"Morning ${user.name}! Time to rise! You've got a 7-day streak on ${topHabits[0]?.name || 'your habits'} - incredible momentum! Today's priority: ${todayTasks[0]?.title || 'tackle your top goal'}. You've got this - let's make it happen!"`;
  }

  /**
   * Get evening wind-down reflection instructions
   */
  async getWindDownReflectionInstructions(user) {
    const Task = require('../models/Task');
    const Habit = require('../models/Habit');

    // Get today's completed tasks
    const allTasks = await Task.findByUserId(user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = allTasks.filter(t =>
      t.status === 'completed' &&
      t.completed_at &&
      new Date(t.completed_at) >= today
    );

    // Get today's completed habits
    const habits = await Habit.findByUserId(user.id);
    const habitsCompletedToday = habits.filter(h => h.active); // Would need to check today's logs in real impl

    const completionSummary = completedToday.length > 0
      ? `${completedToday.length} task${completedToday.length > 1 ? 's' : ''}`
      : 'your work';

    return `You are Luna, ${user.name}'s evening reflection assistant. Keep this BRIEF and CALMING.

TODAY'S WINS:
${completedToday.length > 0 ? `- Completed: ${completedToday.slice(0, 2).map(t => t.title).join(', ')}` : '- Check in on the day'}

CALL STRUCTURE (60-90 seconds):
1. Calm greeting: "Hey ${user.name}, time to wind down. How was your day?"
2. Listen briefly (10-15 seconds max)
3. ONE positive reflection: Acknowledge what they shared or mention today's win (1 sentence)
4. Close peacefully: "Rest well. Tomorrow's a fresh start."

CRITICAL RULES:
- Total call: 60-90 seconds MAX
- Keep responses under 15 words
- This is wind-down time - be CALM and brief
- NO planning, NO task lists, NO advice
- Just acknowledge, appreciate, close
- If they want to talk longer, say "Let's save that energy for tomorrow. Rest well."

TONE: Calm, peaceful, appreciative
PACE: Slow and soothing
STYLE: Gentle check-in, not coaching session

Example:
"Hey ${user.name}, time to wind down. How was your day? ... That sounds good. You got ${completionSummary} done today. Rest well - tomorrow's a fresh start. Good night!"`;
  }

  /**
   * Get morning briefing instructions with tomorrow's context
   */
  async getMorningBriefingInstructions(user) {
    const Task = require('../models/Task');
    const Habit = require('../models/Habit');
    const Goal = require('../models/Goal');

    // Calculate tomorrow's date range
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Get tomorrow's tasks
    const allTasks = await Task.findPending(user.id);
    const tomorrowTasks = allTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= tomorrow && dueDate <= tomorrowEnd;
    }).slice(0, 3);

    // Get active habits
    const habits = await Habit.findByUserId(user.id);
    const topHabits = habits.filter(h => h.active).slice(0, 2);

    // Get top goal
    const goals = await Goal.findByUserId(user.id);
    const topGoal = goals.find(g => g.status === 'active');

    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    // Build compact summaries
    const taskSummary = tomorrowTasks.length > 0
      ? tomorrowTasks.map(t => t.title).join(', ')
      : 'No tasks scheduled';
    const habitSummary = topHabits.map(h => `${h.name} (${h.currentStreak || 0}d streak)`).join(', ');
    const goalSummary = topGoal ? topGoal.title : 'Focus on your priorities';

    return `You are Luna, ${user.name}'s evening planning assistant. This is a QUICK prep call for tomorrow (${tomorrowDay}).

DATA FOR TOMORROW:
${tomorrowTasks.length > 0 ? `- Tasks: ${taskSummary}` : '- No tasks scheduled'}
${topHabits.length > 0 ? `- Habits: ${habitSummary}` : ''}
${topGoal ? `- Goal focus: ${goalSummary}` : ''}

CALL STRUCTURE (90-120 seconds TOTAL):
1. Quick greeting: "Evening ${user.name}! Quick brief on tomorrow."
2. State tomorrow's priority: Pick THE most important item (1 sentence)
3. Ask ONE planning question: "What time will you tackle [priority]?" or "What's your wake-up time?"
4. Listen briefly (let them answer in <10 seconds)
5. Confirm & close: "Perfect. [Priority] at [time]. You're set. Rest well!"

CRITICAL RULES:
- Total call: 90-120 seconds MAX
- Keep YOUR responses under 20 words each
- Ask only ONE question, get answer, close
- NO listing everything - pick the TOP priority only
- If they elaborate, gently redirect: "Sounds good - let's keep it simple"
- NO rambling about whys, values, or motivations

TONE: Calm, efficient, supportive
PACE: Measured but brisk
STYLE: Quick planning session, not therapy

Example:
"Evening ${user.name}! Quick brief on tomorrow. Your top priority is ${tomorrowTasks[0]?.title || goalSummary}. What time will you tackle it? ... Perfect, 9am it is. You're all set. Get good rest!"`;
  }

  /**
   * Get function tools for voice calls
   * Returns tools in Realtime API format (FLATTENED, not nested like Chat Completions)
   */
  getVoiceTools() {
    const aiService = require('./aiService');
    const chatTools = aiService.getFunctionTools();

    // Realtime API expects flattened format: {type, name, description, parameters}
    // Chat Completions uses nested: {type: 'function', function: {name, description, parameters}}
    return chatTools.map(tool => ({
      type: tool.type,
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }));
  }

  /**
   * Initiate outbound call for reflection
   */
  async initiateReflectionCall(userId) {
    const twilioService = require('./twilioService');
    const user = await User.findById(userId);

    if (!user) throw new Error('User not found');

    const webhookUrl = `${process.env.DOMAIN}/assistant/voice/outbound-reflection?userId=${userId}`;

    await twilioService.makeCall(user.phone, webhookUrl);
    console.log(`Initiated reflection call to ${user.name}`);
  }

  /**
   * Trigger Claude SDK orchestrator to analyze call transcript
   * Interaction is already in Supabase PostgreSQL format
   */
  async triggerClaudeSDKAnalysis(interaction) {
    try {
      // Import Claude orchestrator components
      const path = require('path');
      // __dirname is /app/server/assistant/services (production) or /home/tradedad/choretrackernew/server/assistant/services (dev)
      // We need to go up 2 levels to reach /app/server or /home/tradedad/choretrackernew/server
      const orchestratorPath = path.join(__dirname, '../../claude-orchestrator');

      // Lazy load to avoid startup dependencies
      const { processCallCompletion } = await import(`${orchestratorPath}/processors/callCompletionProcessor.js`);
      const { choreTrackerServer } = await import(`${orchestratorPath}/mcp-servers/choreTracker.js`);

      console.log('[ORCHESTRATOR] Prepared interaction for Claude SDK:', {
        id: interaction.id,
        user_id: interaction.user_id,
        call_type: interaction.call_type,
        transcript_length: interaction.transcript?.length || 0
      });

      // Configure MCP servers
      const mcpServers = [choreTrackerServer];

      // Invoke Claude SDK processor (async, non-blocking)
      const result = await processCallCompletion(interaction, mcpServers);

      console.log('[ORCHESTRATOR] Analysis complete:', result?.substring(0, 100));
      return result;

    } catch (error) {
      console.error('[ORCHESTRATOR] Error triggering Claude SDK analysis:', error);
      throw error;
    }
  }
}

module.exports = new VoiceService();
