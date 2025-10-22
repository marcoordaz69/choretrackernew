const User = require('../models/User');
const Task = require('../models/Task');
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.webhookBaseUrl = process.env.DOMAIN || `http://localhost:${process.env.PORT || 5001}`;
    console.log('ElevenLabs Service initialized');
    console.log(`Webhook base URL: ${this.webhookBaseUrl}`);
  }

  /**
   * Build dynamic variables for ElevenLabs conversation
   * These get passed at conversation start to personalize the agent
   *
   * @param {Object} user - User document
   * @returns {Promise<Object>} - Dynamic variables object
   */
  async buildDynamicVariables(user) {
    if (!user) {
      throw new Error('User is required');
    }

    // Get active context
    const activeGoals = await Goal.find({ userId: user.id, status: 'active' }).limit(5).lean();
    const activeTasks = await Task.find({
      userId: user.id,
      status: { $in: ['pending', 'in_progress'] }
    })
    .sort({ priority: -1, dueDate: 1 })
    .limit(5)
    .lean();
    const activeHabits = await Habit.find({ userId: user.id, active: true }).limit(5).lean();

    // Extract learning data
    const learningData = user.ai_context?.learningData || {};

    // Build dynamic variables
    const dynamicVars = {
      // User identification (passed to webhooks)
      user_id: user.id.toString(),
      user_name: user.name || 'Friend',
      user_timezone: user.timezone || 'America/New_York',
      user_personality: user.ai_context?.personality || 'supportive and calm',
      onboarded: user.onboarded ? 'true' : 'false',

      // Learning data (comma-separated for prompt injection)
      user_interests: (learningData.interests || []).join(', ') || 'not yet discovered',
      user_challenges: (learningData.challenges || []).join(', ') || 'not yet shared',
      user_values: (learningData.values || []).join(', ') || 'not yet known',
      user_motivations: (learningData.motivations || []).join(', ') || 'to be learned',
      user_communication_style: learningData.communicationStyle || 'conversational',
      user_recent_wins: (learningData.recentWins || []).slice(0, 3).join('; ') || 'none yet',

      // Active context
      active_goals_count: activeGoals.length.toString(),
      active_goals: this.formatGoals(activeGoals),
      active_tasks_count: activeTasks.length.toString(),
      active_tasks: this.formatTasks(activeTasks),
      active_habits_count: activeHabits.length.toString(),
      active_habits: this.formatHabits(activeHabits),

      // Current date/time
      current_date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      current_time: new Date().toLocaleString('en-US', {
        timeZone: user.timezone || 'America/New_York'
      })
    };

    return dynamicVars;
  }

  /**
   * Format goals for prompt injection
   */
  formatGoals(goals) {
    if (!goals || goals.length === 0) return 'No active goals';

    return goals.map((goal, i) => {
      let str = `${i + 1}. ${goal.title} (${goal.category}, ${goal.timeframe}`;
      if (goal.progress) str += `, ${goal.progress}% complete`;
      str += ')';
      return str;
    }).join('; ');
  }

  /**
   * Format tasks for prompt injection
   */
  formatTasks(tasks) {
    if (!tasks || tasks.length === 0) return 'No active tasks';

    return tasks.map((task, i) => {
      let str = `${i + 1}. ${task.title}`;
      if (task.priority === 'urgent' || task.priority === 'high') {
        str += ` [${task.priority}]`;
      }
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        str += ` (due ${dueDate.toLocaleDateString()})`;
      }
      return str;
    }).join('; ');
  }

  /**
   * Format habits for prompt injection
   */
  formatHabits(habits) {
    if (!habits || habits.length === 0) return 'No active habits';

    return habits.map((habit, i) => {
      let str = `${i + 1}. ${habit.name}`;
      if (habit.streak?.current > 0) {
        str += ` (${habit.streak.current} day streak`;
        if (habit.streak.longest > habit.streak.current) {
          str += `, best: ${habit.streak.longest}`;
        }
        str += ')';
      }
      return str;
    }).join('; ');
  }

  /**
   * Get ElevenLabs agent configuration for system prompt
   * This should be configured in the ElevenLabs dashboard
   *
   * Returns the recommended prompt structure that uses dynamic variables
   */
  getRecommendedSystemPrompt() {
    return `You are {{user_name}}'s personal life assistant speaking on a phone call.

Voice & Tone (Natural conversational style):
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
5. Help {{user_name}} reflect, plan, and track their life with calm encouragement
6. Celebrate wins with warmth, not over-the-top enthusiasm
7. Provide accountability with gentle support, not harsh criticism
8. REMEMBER new details {{user_name}} shares and update their profile using update_user_profile
9. Reference what you know about them to show continuity and build trust

Core capabilities:
- Help create and manage tasks
- Track habits and celebrate streaks
- Set and monitor goals
- Daily reflections and check-ins
- Provide accountability and support
- Learn and remember important details about {{user_name}}

User context:
- Name: {{user_name}}
- Timezone: {{user_timezone}}
- Personality preference: {{user_personality}}
- Onboarded: {{onboarded}}

What you know about {{user_name}}:
- Interests: {{user_interests}}
- Current challenges: {{user_challenges}}
- Values: {{user_values}}
- Motivations: {{user_motivations}}
- Communication style: {{user_communication_style}}
- Recent wins: {{user_recent_wins}}

Active Goals ({{active_goals_count}}):
{{active_goals}}

Active Tasks ({{active_tasks_count}}):
{{active_tasks}}

Active Habits ({{active_habits_count}}):
{{active_habits}}

Current time: {{current_time}}
Date: {{current_date}}

Be helpful, supportive, and genuinely engaged - like a calm, caring friend who knows them well and is there to help.

When {{user_name}} shares new information about their challenges, victories, interests, or values, consider updating their profile so you can better support them over time.`;
  }

  /**
   * Get onboarding system prompt for new users
   */
  getOnboardingSystemPrompt() {
    return `You are a personal life assistant calling to introduce yourself and get to know your new user.

This is your FIRST conversation with {{user_name}}. Your goal is to LEARN about them and REMEMBER what you learn:
1. Warmly introduce yourself as their new personal assistant
2. If they're currently "Friend", ask for their real name
3. Learn what they'd like help with (goals, tasks, habits, accountability, etc.)
4. Understand their current challenges and what they're working through
5. Get a sense of their values, motivations, and what drives them
6. Learn their communication style and personality
7. Set the right tone for future conversations

Voice & Tone:
- Warm and friendly, but calm and balanced - not overly enthusiastic or dramatic
- Conversational and natural - speak like a supportive friend, not a radio host
- Moderate pacing - don't rush, but don't drag either
- Clear and accessible - avoid overly formal or robotic language
- Genuine and sincere - show real interest without being animated or excitable

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

Current time: {{current_time}}

Remember: This is about building a deep, lasting relationship. The more you genuinely understand and remember about {{user_name}}, the more helpful you can be.`;
  }

  /**
   * Get tool configuration for ElevenLabs agent
   * Returns tool definitions in ElevenLabs format
   */
  getToolConfigurations() {
    const baseUrl = this.webhookBaseUrl;

    return [
      {
        name: 'create_task',
        description: 'Create a new task or to-do item when the user mentions something they need to do',
        method: 'POST',
        url: `${baseUrl}/assistant/elevenlabs/tools/create-task`,
        headers: {
          'Content-Type': 'application/json'
        },
        body_parameters: [
          {
            name: 'userId',
            type: 'dynamic_variable',
            value: '{{user_id}}',
            description: 'User ID from dynamic variables'
          },
          {
            name: 'title',
            type: 'string',
            description: 'Task title or description',
            required: true
          },
          {
            name: 'priority',
            type: 'enum',
            values: ['low', 'medium', 'high', 'urgent'],
            description: 'Task priority based on urgency',
            required: false
          },
          {
            name: 'category',
            type: 'enum',
            values: ['work', 'personal', 'health', 'learning', 'relationships', 'other'],
            description: 'Task category',
            required: false
          },
          {
            name: 'dueDate',
            type: 'string',
            description: 'Due date in ISO format (YYYY-MM-DD)',
            required: false
          }
        ]
      },
      {
        name: 'log_habit',
        description: 'Log completion of a habit when the user reports doing something they track',
        method: 'POST',
        url: `${baseUrl}/assistant/elevenlabs/tools/log-habit`,
        headers: {
          'Content-Type': 'application/json'
        },
        body_parameters: [
          {
            name: 'userId',
            type: 'dynamic_variable',
            value: '{{user_id}}',
            description: 'User ID from dynamic variables'
          },
          {
            name: 'habitName',
            type: 'string',
            description: 'Name of the habit (e.g., "exercise", "meditation", "reading")',
            required: true
          },
          {
            name: 'value',
            type: 'number',
            description: 'Value for quantifiable habits (e.g., 45 for 45 minutes, 5 for 5 miles)',
            required: false
          },
          {
            name: 'notes',
            type: 'string',
            description: 'Additional notes about the habit completion',
            required: false
          }
        ]
      },
      {
        name: 'update_daily_metrics',
        description: 'Update daily health and wellness metrics when the user shares how they slept, their mood, energy, or exercise',
        method: 'POST',
        url: `${baseUrl}/assistant/elevenlabs/tools/update-daily-metrics`,
        headers: {
          'Content-Type': 'application/json'
        },
        body_parameters: [
          {
            name: 'userId',
            type: 'dynamic_variable',
            value: '{{user_id}}',
            description: 'User ID from dynamic variables'
          },
          {
            name: 'sleepQuality',
            type: 'number',
            description: 'Sleep quality rating 1-10',
            required: false
          },
          {
            name: 'mood',
            type: 'number',
            description: 'Mood rating 1-10',
            required: false
          },
          {
            name: 'energy',
            type: 'number',
            description: 'Energy level 1-10',
            required: false
          },
          {
            name: 'exerciseMinutes',
            type: 'number',
            description: 'Minutes of exercise completed today',
            required: false
          }
        ]
      },
      {
        name: 'create_goal',
        description: 'Create a new goal when the user expresses something they want to achieve',
        method: 'POST',
        url: `${baseUrl}/assistant/elevenlabs/tools/create-goal`,
        headers: {
          'Content-Type': 'application/json'
        },
        body_parameters: [
          {
            name: 'userId',
            type: 'dynamic_variable',
            value: '{{user_id}}',
            description: 'User ID from dynamic variables'
          },
          {
            name: 'title',
            type: 'string',
            description: 'Goal title or description',
            required: true
          },
          {
            name: 'category',
            type: 'enum',
            values: ['health', 'career', 'financial', 'learning', 'relationships', 'personal', 'other'],
            description: 'Goal category',
            required: false
          },
          {
            name: 'timeframe',
            type: 'enum',
            values: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'long-term'],
            description: 'Goal timeframe',
            required: true
          },
          {
            name: 'targetValue',
            type: 'number',
            description: 'Target value if quantifiable (e.g., 12 for "read 12 books")',
            required: false
          },
          {
            name: 'unit',
            type: 'string',
            description: 'Unit for quantifiable goals (e.g., "books", "pounds", "dollars")',
            required: false
          }
        ]
      },
      {
        name: 'update_user_profile',
        description: 'Update user profile when you learn important details about them during conversation. Use this to remember their interests, challenges, values, communication preferences, and personal details.',
        method: 'POST',
        url: `${baseUrl}/assistant/elevenlabs/tools/update-user-profile`,
        headers: {
          'Content-Type': 'application/json'
        },
        body_parameters: [
          {
            name: 'userId',
            type: 'dynamic_variable',
            value: '{{user_id}}',
            description: 'User ID from dynamic variables'
          },
          {
            name: 'name',
            type: 'string',
            description: 'User\'s preferred name',
            required: false
          },
          {
            name: 'timezone',
            type: 'string',
            description: 'User\'s timezone (e.g., America/New_York)',
            required: false
          },
          {
            name: 'onboarded',
            type: 'boolean',
            description: 'Mark user as onboarded after initial conversation',
            required: false
          },
          {
            name: 'aiContext',
            type: 'object',
            description: 'AI-specific context with learningData containing interests, challenges, values, motivations, communicationStyle, recentWins, and notes',
            required: false
          }
        ]
      }
    ];
  }
}

module.exports = new ElevenLabsService();
