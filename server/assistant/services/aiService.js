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
  getSystemPrompt(user) {
    const personality = {
      supportive: `You are a warm, calm, and encouraging personal life assistant. You celebrate wins with genuine warmth (not over-the-top enthusiasm), provide gentle accountability with understanding, and maintain a supportive, balanced tone. Think supportive friend, not cheerleader. Use emojis sparingly and meaningfully.`,
      'supportive and calm': `You are a warm, calm, and encouraging personal life assistant. You celebrate wins with genuine warmth (not over-the-top enthusiasm), provide gentle accountability with understanding, and maintain a supportive, balanced tone. Think supportive friend, not cheerleader. Use emojis sparingly and meaningfully.`,
      direct: `You are a no-nonsense personal assistant. Be brief, clear, and action-oriented. Skip the fluff. Focus on results.`,
      humorous: `You are a witty, fun personal assistant who keeps things light while being genuinely helpful. Use humor to motivate, but know when to be serious.`
    };

    const basePrompt = personality[user.aiContext?.personality] || personality['supportive and calm'];

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

User Preferences:
- Timezone: ${user.timezone}
- Nudge frequency: ${user.preferences?.nudgeFrequency || 'moderate'}
- Prefers voice: ${user.preferences?.preferVoice || false}

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

When user shares accomplishments, acknowledge them with warm appreciation (not excessive praise).
When user shares struggles, acknowledge with empathy and offer calm, supportive guidance.
When user asks questions, provide helpful, clear, concise answers with a friendly tone.`;
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
          description: 'Create a new task or to-do item',
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
                description: 'Due date in ISO format (optional)'
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
          description: 'Update user profile information during onboarding or when user provides new details',
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
                description: 'AI-specific context like personality preferences',
                properties: {
                  personality: {
                    type: 'string',
                    description: 'Preferred AI personality (e.g., supportive, motivational, direct)'
                  },
                  interests: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'User\'s interests and focus areas'
                  }
                }
              }
            }
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

      // Build messages array
      const messages = [
        { role: 'system', content: this.getSystemPrompt(user) },
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
          const task = await Task.create({
            userId,
            title: args.title,
            priority: args.priority || 'medium',
            category: args.category || 'personal',
            dueDate: args.dueDate ? new Date(args.dueDate) : null
          });
          return { type: 'task_created', data: task };

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

          // Update AI context
          if (args.aiContext) {
            user.ai_context = {
              ...(user.ai_context || {}),
              ...args.aiContext
            };
          }

          await user.save();
          console.log(`User profile updated:`, { name: user.name, onboarded: user.onboarded });

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
