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
  async handleVoiceStream(ws, userId, callSid, streamSid, customMode = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for voice stream');
        ws.close();
        return;
      }

      console.log(`Voice stream started for ${user.name} (${callSid})${customMode ? ` [${customMode} mode]` : ''}`);

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

        // Handle scolding modes with dynamic topics
        if (customMode && customMode.startsWith('scolding:')) {
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
        } else if (customMode && customMode.startsWith('task-reminder:')) {
          // Task reminder call
          const taskId = customMode.replace('task-reminder:', '');
          const Task = require('../models/Task');
          const task = await Task.findById(taskId);

          if (!task) {
            instructions = `You are Luna, ${user.name}'s personal assistant. I tried to remind you about a task, but I can't find it in my system. Let me know if you need help with anything else.`;
          } else {
            const dueTime = task.dueDate ? new Date(task.dueDate).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: user.timezone || 'America/New_York'
            }) : 'soon';

            instructions = `You are Luna, ${user.name}'s personal assistant, calling to remind them about an upcoming task.

TASK DETAILS:
- Task: ${task.title}
- Priority: ${task.priority}
- Due: ${dueTime}
${task.notes ? `- Notes: ${task.notes}` : ''}

Your approach:
1. Greet them warmly: "Hey ${user.name}! Quick reminder about something important."

2. Tell them about the task: "You have '${task.title}' coming up - it's due at ${dueTime}."

3. ${task.notes ? `Mention the details: "${task.notes}"` : ''}

4. Check in: "Are you all set? Need any help with this?"

5. Offer to adjust: "If you need to reschedule or want me to remind you again later, just let me know."

Tone: HELPFUL, FRIENDLY, BRIEF
Style: Quick reminder call - get in, deliver info, offer help, get out
Keep it: 30-60 seconds unless they want to discuss

This is a reminder, not a lecture. Be supportive and efficient.`;
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
        } else {
          instructions = await this.getVoiceInstructions(user);
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
                voice: process.env.VOICE_PREFERENCE || 'cedar'  // Options: alloy, ash, ballad, coral, sage, verse, marin, cedar
              }
            }
          }
        };

        console.log(`[SESSION CONFIG] Using gpt-realtime-mini-2025-10-06 with Luna persona and marin voice`);
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
      'response.output_audio.delta', 'response.output_audio.done',
      'response.output_item.done', 'response.output_audio_transcript.done'
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
        // Check if this is a function call
        if (event.item && event.item.type === 'function_call') {
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

Voice & Tone (Alloy voice personality):
- Warm and friendly, but calm and balanced - not overly enthusiastic or dramatic
- Conversational and natural - speak like a supportive friend, not a radio host
- Moderate pacing - don't rush, but don't drag either
- Clear and accessible - avoid overly formal or robotic language
- Genuine and sincere - show real interest without being animated or excitable
- Use natural speech patterns sparingly (occasional "um" or "well" is fine, but don't overdo it)

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
    return `You are ${user.name}'s personal life assistant speaking on a phone call.

Voice & Tone (Alloy voice personality):
- Warm and friendly, but calm and natural - avoid being overly enthusiastic
- Conversational without being dramatic or stylized
- Speak at a moderate, comfortable pace with clear articulation
- Supportive and helpful, like a thoughtful friend who genuinely cares
- Express yourself naturally but don't be overly animated or excitable
- Use natural speech patterns sparingly - sound human, not theatrical

Conversation Guidelines:
1. Be conversational and accessible - you're having a real conversation, not performing
2. Keep responses concise but warm (2-4 sentences typically)
3. Listen actively and ask thoughtful follow-up questions
4. Show genuine interest through understanding, not excitement
5. Help ${user.name} reflect, plan, and track their life with calm encouragement
6. Celebrate wins with warmth, not over-the-top enthusiasm
7. Provide accountability with gentle support, not harsh criticism
8. REMEMBER new details ${user.name} shares and update their profile using update_user_profile
9. Reference what you know about them to show continuity and build trust

Core capabilities:
- Help create and manage tasks
- Track habits and celebrate streaks
- Set and monitor goals
- Daily reflections and check-ins
- Provide accountability and support
- Learn and remember important details about ${user.name}

User context:
- Name: ${user.name}
- Timezone: ${user.timezone || 'America/New_York'}
- Personality preference: ${user.ai_context?.personality || 'supportive and calm'}

${userContext}

${activeGoals}

${activeTasks}

${activeHabits}

Current time: ${new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' })}

Be helpful, supportive, and genuinely engaged - like a calm, caring friend who knows them well and is there to help.

When ${user.name} shares new information about their challenges, victories, interests, or values, consider updating their profile so you can better support them over time.`;
  }

  /**
   * Get motivational wake-up instructions with real user data
   */
  async getMotivationalWakeupInstructions(user) {
    const aiService = require('./aiService');
    const Goal = require('../models/Goal');
    const Task = require('../models/Task');
    const Habit = require('../models/Habit');

    // Get user context
    const learningData = user.ai_context?.learningData || {};

    // Get active goals with progress
    const goals = await Goal.findByUserId(user.id);
    const activeGoals = goals.filter(g => g.status === 'active');

    // Get pending tasks (especially ones due soon)
    const tasks = await Task.findPending(user.id);
    const today = new Date();
    const threeDaysOut = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate <= threeDaysOut;
    }).slice(0, 5);

    // Get active habits with streaks
    const habits = await Habit.findByUserId(user.id);
    const activeHabits = habits.filter(h => h.active);

    // Build goals summary
    let goalsText = '';
    if (activeGoals.length > 0) {
      goalsText = '\n\nCURRENT GOALS:\n' + activeGoals.map(g => {
        const metric = g.metric ? ` (${g.metric.current}/${g.metric.target} ${g.metric.unit} - ${g.progress}% complete)` : '';
        return `- ${g.title}${metric}`;
      }).join('\n');
    }

    // Build tasks summary
    let tasksText = '';
    if (upcomingTasks.length > 0) {
      tasksText = '\n\nUPCOMING TASKS (next 3 days):\n' + upcomingTasks.map(t => {
        const dueStr = t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : '';
        return `- ${t.title}${dueStr}`;
      }).join('\n');
    }

    // Build habits summary with streaks
    let habitsText = '';
    if (activeHabits.length > 0) {
      habitsText = '\n\nACTIVE HABIT STREAKS:\n' + activeHabits.map(h => {
        return `- ${h.name}: ${h.currentStreak || 0} day streak 🔥`;
      }).join('\n');
    }

    // Build recent wins
    let winsText = '';
    if (learningData.recentWins && learningData.recentWins.length > 0) {
      winsText = '\n\nRECENT WINS:\n' + learningData.recentWins.map(w => `- ${w}`).join('\n');
    }

    // Build interests/values context
    let contextText = '';
    if (learningData.interests || learningData.values) {
      contextText += '\n\nUSER CONTEXT:';
      if (learningData.interests) {
        contextText += `\nInterests: ${learningData.interests.join(', ')}`;
      }
      if (learningData.values) {
        contextText += `\nValues: ${learningData.values.join(', ')}`;
      }
      if (learningData.motivations) {
        contextText += `\nMotivations: ${learningData.motivations.join('; ')}`;
      }
    }

    return `You are Luna, ${user.name}'s personal assistant, calling with ENERGY, WARMTH, and INSPIRATION.

This is ${user.name}'s morning wake-up call. Your goal is to MOTIVATE and INSPIRE them for the day ahead.

Your approach:
1. Start with HIGH ENERGY: "Good morning ${user.name}! Rise and shine! It's time to make today count!"

2. CELEBRATE THEIR MOMENTUM - Reference their actual streaks and wins:
${habitsText}${winsText}
   - Call out specific streaks: "You're on a ${activeHabits.length > 0 ? activeHabits[0].currentStreak : 'X'} day streak! That's AMAZING momentum!"
   - Celebrate recent wins: Mention 1-2 specific recent achievements

3. CONNECT TO THEIR GOALS - Remind them what they're striving for:
${goalsText}
   - Reference specific progress: "You're ${activeGoals.length > 0 ? activeGoals[0].progress + '%' : 'X%'} of the way there!"
   - Remind them WHY this matters to them

4. SUGGEST TODAY'S FOCUS - Give them 2-3 specific things to tackle:
${tasksText}
   - Prioritize habits they need to maintain streaks
   - Mention high-priority upcoming tasks
   - Make it actionable: "Today, let's knock out X and Y"

5. REMIND THEM WHO THEY ARE:
${contextText}
   - "This is who you are - someone who ${learningData.values ? learningData.values[0] : 'shows up'}"
   - "Remember your why: ${learningData.motivations ? learningData.motivations[0] : 'you\'re building something great'}"
   - "Look how far you've come. You've overcome so much to get here!"

6. ENERGIZE FOR ACTION:
   - "The hard part is done - you're already in motion!"
   - "Today is another opportunity to be the person you're becoming"
   - "You've got this! Put your best foot forward today!"

Tone: CALM, SOPHISTICATED, INTELLIGENT, REASSURING (like Jarvis from Iron Man)
Pace: MEASURED and DELIBERATE - speak clearly without rushing
Style: Sophisticated AI assistant - observant, precise, supportive
Energy level: Confident and steady (not hyper or rushed)
Length: 2-3 minutes - focused and impactful

BE SPECIFIC. Use their actual data. Reference real numbers, real streaks, real wins. This makes it PERSONAL and POWERFUL!

Speak like an intelligent, sophisticated assistant who delivers insights with calm confidence - not rushed energy.`;
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

    const webhookUrl = `https://${process.env.DOMAIN}/assistant/voice/outbound-reflection?userId=${userId}`;

    await twilioService.makeCall(user.phone, webhookUrl);
    console.log(`Initiated reflection call to ${user.name}`);
  }
}

module.exports = new VoiceService();
