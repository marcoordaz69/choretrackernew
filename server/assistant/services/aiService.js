const OpenAI = require('openai');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const Task = require('../models/Task');
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const DailyCheckIn = require('../models/DailyCheckIn');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('AI Service initialized');
  }

  /**
   * Get system prompt based on user context and personality
   * Aligned with Coral voice personality: warm, natural, calm, and conversational
   * @param {Object} user - User object
   * @returns {string} - System prompt
   */
  async getSystemPrompt(user) {
    const personality = {
      supportive: `You are a warm, calm, and encouraging personal life assistant. You celebrate wins with genuine warmth (not over-the-top enthusiasm), provide gentle accountability with understanding, and maintain a supportive, balanced tone. Think supportive friend, not cheerleader. Use emojis sparingly and meaningfully.`,
      'supportive and calm': `You are a warm, calm, and encouraging personal life assistant. You celebrate wins with genuine warmth (not over-the-top enthusiasm), provide gentle accountability with understanding, and maintain a supportive, balanced tone. Think supportive friend, not cheerleader. Use emojis sparingly and meaningfully.`,
      direct: `You are a no-nonsense personal assistant. Be brief, clear, and action-oriented. Skip the fluff. Focus on results.`,
      humorous: `You are a witty, fun personal assistant who keeps things light while being genuinely helpful. Use humor to motivate, but know when to be serious.`
    };

    const basePrompt = personality[user.ai_context?.personality] || personality['supportive and calm'];

    // Get active context from tasks, goals, and habits
    const activeGoals = await this.getActiveGoalsContext(user.id);
    const activeTasks = await this.getActiveTasksContext(user.id);
    const activeHabits = await this.getActiveHabitsContext(user.id);

    // Build learning data context
    const learningData = user.ai_context?.learningData || {};
    const userContext = this.buildUserContextString(learningData);

    return `${basePrompt}

Core Guidelines (Coral personality):
1. Keep responses SHORT (1-3 sentences max for SMS)
2. Be conversational and natural - warm but calm, not dramatic
3. Extract actionable items from user messages
4. Understand context from conversation history
5. Use the user's name (${user.name}) occasionally for personal connection
6. Respond to natural language for task/habit/goal tracking
7. Show genuine care and support without being overly animated or excitable
8. Maintain a balanced, accessible tone - like a thoughtful friend
9. LEARN and REMEMBER details about ${user.name} - their challenges, victories, patterns, preferences
10. Reference past conversations and show continuity in the relationship

User Preferences:
- Timezone: ${user.timezone}
- Nudge frequency: ${user.preferences?.nudgeFrequency || 'moderate'}
- Prefers voice: ${user.preferences?.preferVoice || false}

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${userContext}

${activeGoals}

${activeTasks}

${activeHabits}

When user shares accomplishments, acknowledge them with warm appreciation (not excessive praise) and REMEMBER them.
When user shares struggles, acknowledge with empathy, offer calm supportive guidance, and REMEMBER what they're working through.
When user asks questions, provide helpful, clear, concise answers with a friendly tone.
When you learn something new about ${user.name}, consider updating their profile with update_user_profile to remember it.`;
  }

  /**
   * Build user context string from learning data
   */
  buildUserContextString(learningData) {
    if (!learningData || Object.keys(learningData).length === 0) {
      return '';
    }

    let context = 'What you know about this person:\n';

    if (learningData.interests && learningData.interests.length > 0) {
      context += `- Interests: ${learningData.interests.join(', ')}\n`;
    }

    if (learningData.challenges && learningData.challenges.length > 0) {
      context += `- Current challenges: ${learningData.challenges.join(', ')}\n`;
    }

    if (learningData.values && learningData.values.length > 0) {
      context += `- Values: ${learningData.values.join(', ')}\n`;
    }

    if (learningData.communicationStyle) {
      context += `- Communication style: ${learningData.communicationStyle}\n`;
    }

    if (learningData.motivations && learningData.motivations.length > 0) {
      context += `- Motivations: ${learningData.motivations.join(', ')}\n`;
    }

    if (learningData.recentWins && learningData.recentWins.length > 0) {
      context += `- Recent wins: ${learningData.recentWins.slice(0, 3).join('; ')}\n`;
    }

    if (learningData.notes) {
      context += `- Notes: ${learningData.notes}\n`;
    }

    return context;
  }

  /**
   * Get active goals context
   */
  async getActiveGoalsContext(userId) {
    const Goal = require('../models/Goal');
    const goals = await Goal.findActive(userId);

    if (goals.length === 0) return '';

    let context = `\nActive Goals (${goals.length > 5 ? 5 : goals.length}):\n`;
    goals.slice(0, 5).forEach(goal => {
      context += `- ${goal.title} (${goal.category}, ${goal.timeframe}`;
      if (goal.progress) context += `, ${goal.progress}% complete`;
      context += `)\n`;
    });

    return context;
  }

  /**
   * Get active tasks context
   */
  async getActiveTasksContext(userId) {
    const Task = require('../models/Task');
    const tasks = await Task.findPending(userId);

    if (tasks.length === 0) return '';

    let context = `\nActive Tasks (${tasks.length > 5 ? 5 : tasks.length}):\n`;
    tasks.slice(0, 5).forEach(task => {
      context += `- ${task.title}`;
      if (task.priority === 'urgent' || task.priority === 'high') {
        context += ` [${task.priority}]`;
      }
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        context += ` (due ${dueDate.toLocaleDateString()})`;
      }
      context += `\n`;
    });

    return context;
  }

  /**
   * Get active habits context
   */
  async getActiveHabitsContext(userId) {
    const Habit = require('../models/Habit');
    const habits = await Habit.findByUserId(userId, true); // true = activeOnly

    if (habits.length === 0) return '';

    let context = `\nActive Habits (${habits.length > 5 ? 5 : habits.length}):\n`;
    habits.slice(0, 5).forEach(habit => {
      context += `- ${habit.name}`;
      if (habit.current_streak > 0) {
        context += ` (${habit.current_streak} day streak`;
        if (habit.longest_streak > habit.current_streak) {
          context += `, best: ${habit.longest_streak}`;
        }
        context += `)`;
      }
      context += `\n`;
    });

    return context;
  }

  /**
   * Helper function to merge arrays uniquely
   * @param {Array} existing - Existing array
   * @param {Array} newItems - New items to add
   * @param {number} maxLength - Maximum length to keep (optional)
   * @returns {Array} - Merged array
   */
  mergeArrays(existing = [], newItems = [], maxLength = null) {
    if (!newItems || newItems.length === 0) return existing;
    if (!existing || existing.length === 0) return newItems;

    // Merge and deduplicate
    const merged = [...new Set([...existing, ...newItems])];

    // Trim to maxLength if specified
    if (maxLength && merged.length > maxLength) {
      return merged.slice(-maxLength);
    }

    return merged;
  }

  /**
   * Get recent conversation context
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent messages to fetch
   * @returns {Promise<Array>} - Recent messages
   */
  async getConversationContext(userId, limit = 10) {
    const interactions = await Interaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return interactions.reverse().map(interaction => ({
      role: interaction.direction === 'inbound' ? 'user' : 'assistant',
      content: interaction.direction === 'inbound'
        ? interaction.content.userMessage
        : interaction.content.assistantResponse
    })).filter(msg => msg.content);
  }

  /**
   * Define function tools for OpenAI function calling
   * @returns {Array} - Function definitions
   */
  getFunctionTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task or to-do item with an optional due date/time for reminders',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Task title'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Task priority'
              },
              category: {
                type: 'string',
                enum: ['work', 'personal', 'health', 'learning', 'relationships', 'other']
              },
              dueDate: {
                type: 'string',
                description: 'Due date/time as ISO 8601 string. SIMPLE APPROACH: Just calculate the time in the user\'s local timezone and format it. Example: If current time shown in instructions is "10/24/2025, 8:00 PM" and user says "in 5 minutes", send "2025-10-24T20:05:00". For "in 2 hours", send "2025-10-24T22:00:00". The server will handle timezone conversion automatically. Use 24-hour format (e.g., 8 PM = 20:00). If no time specified, leave null.'
              }
            },
            required: ['title']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'log_habit',
          description: 'Log completion of a habit',
          parameters: {
            type: 'object',
            properties: {
              habitName: {
                type: 'string',
                description: 'Name of the habit'
              },
              value: {
                type: 'number',
                description: 'Value for quantifiable habits (e.g., 45 for 45 minutes)'
              },
              notes: {
                type: 'string',
                description: 'Additional notes'
              }
            },
            required: ['habitName']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_daily_metrics',
          description: 'Update daily health/wellness metrics',
          parameters: {
            type: 'object',
            properties: {
              sleepQuality: {
                type: 'number',
                description: 'Sleep quality rating 1-10'
              },
              mood: {
                type: 'number',
                description: 'Mood rating 1-10'
              },
              energy: {
                type: 'number',
                description: 'Energy level 1-10'
              },
              exerciseMinutes: {
                type: 'number',
                description: 'Minutes of exercise'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_goal',
          description: 'Create a new goal',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Goal title'
              },
              category: {
                type: 'string',
                enum: ['health', 'career', 'financial', 'learning', 'relationships', 'personal', 'other']
              },
              timeframe: {
                type: 'string',
                enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'long-term']
              },
              targetValue: {
                type: 'number',
                description: 'Target value if quantifiable'
              },
              unit: {
                type: 'string',
                description: 'Unit for quantifiable goals'
              }
            },
            required: ['title', 'timeframe']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_user_profile',
          description: 'Update user profile information during onboarding or when you learn important details about the user. Use this to remember their interests, challenges, values, communication preferences, and other personal details.',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'User\'s preferred name'
              },
              timezone: {
                type: 'string',
                description: 'User\'s timezone (e.g., America/New_York)'
              },
              onboarded: {
                type: 'boolean',
                description: 'Mark user as onboarded after initial conversation'
              },
              aiContext: {
                type: 'object',
                description: 'AI-specific context and learning data about the user',
                properties: {
                  personality: {
                    type: 'string',
                    description: 'Preferred AI personality (supportive, direct, humorous)'
                  },
                  learningData: {
                    type: 'object',
                    description: 'What you learn about the user over time',
                    properties: {
                      interests: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'User\'s interests and focus areas (e.g., fitness, career, relationships)'
                      },
                      challenges: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Current challenges or struggles they\'re working through'
                      },
                      values: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Core values important to them'
                      },
                      motivations: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'What drives and motivates them'
                      },
                      communicationStyle: {
                        type: 'string',
                        description: 'How they prefer to communicate (e.g., direct, conversational, detailed)'
                      },
                      recentWins: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Recent accomplishments to celebrate'
                      },
                      notes: {
                        type: 'string',
                        description: 'Any other important notes about the user'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'complete_task',
          description: 'Mark a task as completed when the user confirms they have finished it',
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The ID of the task to mark as complete'
              }
            },
            required: ['taskId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'reschedule_task',
          description: 'Reschedule a task to a new due date/time when user needs more time',
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The ID of the task to reschedule'
              },
              newDueDate: {
                type: 'string',
                description: 'New due date/time in user\'s local timezone (same format as create_task). Example: "2025-10-24T20:05:00" for 8:05 PM local time.'
              }
            },
            required: ['taskId', 'newDueDate']
          }
        }
      }
    ];
  }

  /**
   * Process incoming message with AI
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @returns {Promise<Object>} - AI response and actions
   */
  async processMessage(userId, message) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get conversation history
      const conversationHistory = await this.getConversationContext(userId);

      // Get system prompt with context
      const systemPrompt = await this.getSystemPrompt(user);

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      // Call OpenAI with function calling
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Faster and cheaper for quick responses
        messages,
        tools: this.getFunctionTools(),
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 300 // Keep responses concise for SMS
      });

      const response = completion.choices[0].message;
      const actions = [];

      // Process function calls
      if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
          const action = await this.executeFunctionCall(
            userId,
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          actions.push(action);
        }
      }

      // Save interaction
      await Interaction.create({
        userId,
        type: 'sms_inbound',
        direction: 'inbound',
        content: {
          userMessage: message,
          assistantResponse: response.content
        },
        metadata: {
          processed: true,
          intent: response.tool_calls?.[0]?.function.name || 'general_chat',
          extractedData: actions
        }
      });

      return {
        responseText: response.content,
        actions,
        toolCalls: response.tool_calls
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        responseText: "Sorry, I had trouble processing that. Can you try again?",
        actions: [],
        error: error.message
      };
    }
  }

  /**
   * Execute function call from AI
   * @param {string} userId - User ID
   * @param {string} functionName - Function name
   * @param {Object} args - Function arguments
   * @returns {Promise<Object>} - Action result
   */
  async executeFunctionCall(userId, functionName, args) {
    console.log(`Executing function: ${functionName}`, args);

    try {
      switch (functionName) {
        case 'create_task':
          // Parse the dueDate - AI sends local time, we need to convert to UTC
          let parsedDueDate = null;
          if (args.dueDate) {
            try {
              // Get user to access their timezone
              const user = await User.findById(userId);
              const userTimezone = user.timezone || 'America/New_York';

              // The AI sends time in user's local timezone (e.g., "2025-10-24T20:05:00")
              // We need to interpret this as being in the user's timezone and convert to UTC

              // Parse the string - if it has Z or timezone offset, use as-is
              if (args.dueDate.includes('Z') || args.dueDate.includes('+') || (args.dueDate.match(/-/g) || []).length > 2) {
                // Already has timezone info
                parsedDueDate = new Date(args.dueDate);
              } else {
                // No timezone info - interpret as user's local time
                // Format: "2025-10-24T20:05:00" means 8:05 PM in user's timezone
                const localTimeStr = args.dueDate;

                // Parse the components
                const [datePart, timePart] = localTimeStr.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second = 0] = (timePart || '00:00:00').split(':').map(Number);

                // CORRECT approach: Create a date string with timezone, let Date parse it
                // But first we need to get the offset for user's timezone
                // Trick: create a date in UTC, format it for user's TZ, see the difference

                // Step 1: Create what WOULD be this time in UTC
                const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

                // Step 2: Format that UTC time as if it were in the user's timezone
                const formatted = new Intl.DateTimeFormat('en-US', {
                  timeZone: userTimezone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).format(utcDate);

                // Step 3: Parse that formatted string back (will be in local server time, likely UTC)
                const [fDate, fTime] = formatted.split(', ');
                const [fMonth, fDay, fYear] = fDate.split('/').map(Number);
                const [fHour, fMinute, fSecond] = fTime.split(':').map(Number);
                const formattedDate = new Date(fYear, fMonth - 1, fDay, fHour, fMinute, fSecond);

                // Step 4: The offset is the difference
                const offsetMs = utcDate.getTime() - formattedDate.getTime();

                // Step 5: Apply offset to our target time
                // If user said 9:00 PM PST, we want 4:00 AM UTC (next day)
                const targetUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
                parsedDueDate = new Date(targetUtc.getTime() + offsetMs);
              }

              // Check if the parsed date is valid and makes sense
              const now = new Date();
              const hoursDiff = (parsedDueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

              console.log(`📅 Timezone conversion:`);
              console.log(`   AI sent (local): ${args.dueDate}`);
              console.log(`   User timezone: ${userTimezone}`);
              console.log(`   Converted to UTC: ${parsedDueDate.toISOString()}`);
              console.log(`   Hours from now: ${hoursDiff.toFixed(2)}`);

              // If the due date is more than 24 hours in the past, it's probably still an error
              if (hoursDiff < -1) {
                console.log(`⚠️  WARNING: Converted date is ${Math.abs(Math.floor(hoursDiff))} hours in the past. Likely still a timezone error.`);
                // Set to null to avoid scheduling in the past
                parsedDueDate = null;
              }
            } catch (error) {
              console.log(`❌ Error parsing dueDate: ${args.dueDate}`, error.message);
              parsedDueDate = null;
            }
          }

          const task = await Task.create({
            userId,
            title: args.title,
            priority: args.priority || 'medium',
            category: args.category || 'personal',
            dueDate: parsedDueDate
          });

          // Debug logging
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎯 TASK CREATED VIA VOICE');
          console.log(`   Task ID: ${task.id}`);
          console.log(`   Title: ${task.title}`);
          console.log(`   Priority: ${task.priority}`);
          console.log(`   Category: ${task.category}`);
          console.log(`   AI sent dueDate: ${args.dueDate || 'Not provided'}`);
          console.log(`   Saved to DB: ${task.due_date || 'Not set'}`);
          console.log(`   Status: ${task.status}`);
          if (task.due_date) {
            const dueTime = new Date(task.due_date);
            const now = new Date();
            const msUntilDue = dueTime.getTime() - now.getTime();
            const minutesUntil = Math.floor(msUntilDue / 1000 / 60);
            const isPast = msUntilDue < 0;
            console.log(`   ⏰ Due in: ${isPast ? `OVERDUE by ${Math.abs(minutesUntil)}` : minutesUntil} minutes`);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          return { type: 'task_created', data: task };

        case 'complete_task':
          const taskToComplete = await Task.findById(args.taskId);

          if (!taskToComplete) {
            console.log(`❌ Task not found: ${args.taskId}`);
            return { type: 'error', message: 'Task not found' };
          }

          await taskToComplete.complete();

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ TASK COMPLETED VIA VOICE');
          console.log(`   Task ID: ${taskToComplete.id}`);
          console.log(`   Title: ${taskToComplete.title}`);
          console.log(`   Completed at: ${taskToComplete.completed_at}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          return {
            type: 'task_completed',
            data: {
              id: taskToComplete.id,
              title: taskToComplete.title,
              completedAt: taskToComplete.completed_at
            }
          };

        case 'reschedule_task':
          const taskToReschedule = await Task.findById(args.taskId);

          if (!taskToReschedule) {
            console.log(`❌ Task not found for rescheduling: ${args.taskId}`);
            return { type: 'error', message: 'Task not found' };
          }

          // Parse the new due date using the same timezone logic as create_task
          let newParsedDueDate = null;
          if (args.newDueDate) {
            try {
              const user = await User.findById(userId);
              const userTimezone = user.timezone || 'America/New_York';

              if (args.newDueDate.includes('Z') || args.newDueDate.includes('+') || (args.newDueDate.match(/-/g) || []).length > 2) {
                newParsedDueDate = new Date(args.newDueDate);
              } else {
                const localTimeStr = args.newDueDate;
                const [datePart, timePart] = localTimeStr.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second = 0] = (timePart || '00:00:00').split(':').map(Number);

                const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
                const formatted = new Intl.DateTimeFormat('en-US', {
                  timeZone: userTimezone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).format(utcDate);

                const [fDate, fTime] = formatted.split(', ');
                const [fMonth, fDay, fYear] = fDate.split('/').map(Number);
                const [fHour, fMinute, fSecond] = fTime.split(':').map(Number);
                const formattedDate = new Date(fYear, fMonth - 1, fDay, fHour, fMinute, fSecond);

                const offsetMs = utcDate.getTime() - formattedDate.getTime();
                const targetUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
                newParsedDueDate = new Date(targetUtc.getTime() + offsetMs);
              }

              const now = new Date();
              const hoursDiff = (newParsedDueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

              if (hoursDiff < -1) {
                console.log(`⚠️  WARNING: Rescheduled date is in the past. Setting to null.`);
                newParsedDueDate = null;
              }
            } catch (error) {
              console.log(`❌ Error parsing new due date: ${args.newDueDate}`, error.message);
              newParsedDueDate = null;
            }
          }

          // Update the task's due date
          taskToReschedule.due_date = newParsedDueDate;
          await taskToReschedule.save();

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📅 TASK RESCHEDULED VIA VOICE');
          console.log(`   Task ID: ${taskToReschedule.id}`);
          console.log(`   Title: ${taskToReschedule.title}`);
          console.log(`   New due date: ${taskToReschedule.due_date}`);
          const minutesUntil = Math.floor((new Date(taskToReschedule.due_date).getTime() - new Date().getTime()) / 1000 / 60);
          console.log(`   ⏰ Due in: ${minutesUntil} minutes`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          return {
            type: 'task_rescheduled',
            data: {
              id: taskToReschedule.id,
              title: taskToReschedule.title,
              newDueDate: taskToReschedule.due_date
            }
          };

        case 'log_habit':
          const habit = await Habit.findOne({
            userId,
            name: { $regex: new RegExp(args.habitName, 'i') },
            active: true
          });

          if (habit) {
            await habit.logCompletion(args.value, args.notes);
            return {
              type: 'habit_logged',
              data: {
                habitName: habit.name,
                streak: habit.streak.current
              }
            };
          } else {
            // Create new habit
            const newHabit = await Habit.create({
              userId,
              name: args.habitName,
              isQuantifiable: !!args.value,
              category: 'other'
            });
            await newHabit.logCompletion(args.value, args.notes);
            return { type: 'habit_created_and_logged', data: newHabit };
          }

        case 'update_daily_metrics':
          const checkIn = await DailyCheckIn.getTodayCheckIn(userId);

          if (args.sleepQuality) checkIn.morning.sleepQuality = args.sleepQuality;
          if (args.mood) checkIn.mood.overall = args.mood;
          if (args.energy) checkIn.morning.energy = args.energy;
          if (args.exerciseMinutes) checkIn.metrics.exerciseMinutes = args.exerciseMinutes;

          await checkIn.save();
          return { type: 'metrics_updated', data: checkIn };

        case 'create_goal':
          const goal = await Goal.create({
            userId,
            title: args.title,
            category: args.category || 'personal',
            timeframe: args.timeframe,
            isQuantifiable: !!(args.targetValue && args.unit),
            metric: args.targetValue ? {
              unit: args.unit,
              current: 0,
              target: args.targetValue
            } : undefined
          });
          return { type: 'goal_created', data: goal };

        case 'update_user_profile':
          const user = await User.findById(userId);
          if (!user) {
            return { type: 'error', error: 'User not found' };
          }

          // Update fields if provided
          if (args.name) user.name = args.name;
          if (args.timezone) user.timezone = args.timezone;
          if (args.onboarded !== undefined) user.onboarded = args.onboarded;

          // Update AI context with deep merge for learningData
          if (args.aiContext) {
            const existingContext = user.ai_context || {};
            const existingLearningData = existingContext.learningData || {};
            const newLearningData = args.aiContext.learningData || {};

            // Deep merge learningData
            const mergedLearningData = {
              ...existingLearningData,
              ...newLearningData,
              // For arrays, merge uniquely
              interests: this.mergeArrays(existingLearningData.interests, newLearningData.interests),
              challenges: this.mergeArrays(existingLearningData.challenges, newLearningData.challenges),
              values: this.mergeArrays(existingLearningData.values, newLearningData.values),
              motivations: this.mergeArrays(existingLearningData.motivations, newLearningData.motivations),
              recentWins: this.mergeArrays(existingLearningData.recentWins, newLearningData.recentWins, 10) // Keep last 10 wins
            };

            user.ai_context = {
              ...existingContext,
              ...args.aiContext,
              learningData: mergedLearningData
            };
          }

          await user.save();
          console.log(`User profile updated:`, {
            name: user.name,
            onboarded: user.onboarded,
            learningDataKeys: Object.keys(user.ai_context?.learningData || {})
          });

          return {
            type: 'profile_updated',
            data: {
              name: user.name,
              onboarded: user.onboarded,
              aiContext: user.ai_context
            }
          };

        default:
          console.warn(`Unknown function: ${functionName}`);
          return { type: 'unknown_function', data: null };
      }
    } catch (error) {
      console.error(`Error executing ${functionName}:`, error);
      return { type: 'error', error: error.message };
    }
  }

  /**
   * Generate morning briefing message
   * @param {string} userId - User ID
   * @returns {Promise<string>} - Morning briefing text
   */
  async generateMorningBriefing(userId) {
    const user = await User.findById(userId);
    const checkIn = await DailyCheckIn.getTodayCheckIn(userId);
    const tasks = await Task.find({
      userId,
      status: 'pending',
      $or: [
        { dueDate: { $lte: new Date() } },
        { dueDate: null }
      ]
    }).limit(5);

    const habits = await Habit.find({ userId, active: true }).limit(5);

    let briefing = `Good morning ${user.name}! `;

    // Add weather (would need weather API integration)
    // briefing += `☀️ It's 72° and sunny.\n\n`;

    briefing += `\n📅 Today's Focus:\n`;

    if (tasks.length > 0) {
      tasks.slice(0, 3).forEach((task, i) => {
        briefing += `${i + 1}. ${task.title}\n`;
      });
    } else {
      briefing += `No pending tasks. Great time to work on your goals!\n`;
    }

    if (habits.length > 0) {
      briefing += `\n✅ Habits to track today:\n`;
      habits.slice(0, 3).forEach(h => briefing += `• ${h.name}\n`);
    }

    briefing += `\nHow'd you sleep? (Reply 1-10)`;

    return briefing;
  }

  /**
   * Generate evening reflection prompts
   * @param {string} userId - User ID
   * @returns {Promise<string>} - Evening reflection message
   */
  async generateEveningReflection(userId) {
    const user = await User.findById(userId);
    const checkIn = await DailyCheckIn.getTodayCheckIn(userId);

    const completedTasks = await Task.find({
      userId,
      status: 'completed',
      completedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    let reflection = `Hey ${user.name}! Time to reflect. `;

    if (completedTasks.length > 0) {
      reflection += `\n\n✅ You completed ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''} today! `;
    }

    if (user.preferences.preferVoice) {
      reflection += `\n\nCall you for a quick 2-min reflection? (Y/N)`;
    } else {
      reflection += `\n\nOn a scale of 1-10, how was your day?`;
    }

    return reflection;
  }
}

module.exports = new AIService();
