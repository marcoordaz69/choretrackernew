import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Chore Tracker MCP Server
 * Provides Claude with tools to interact with task management system
 */
export const choreTrackerServer = createSdkMcpServer({
  name: 'chore-tracker',
  version: '1.0.0',
  tools: [
    tool(
      'schedule_call',
      'Schedule a future call for user intervention',
      {
        userId: z.string().uuid().describe('User UUID'),
        callType: z.enum([
          'scolding',
          'motivational-wakeup',
          'task-reminder',
          'morning-briefing',
          'wind-down-reflection'
        ]).describe('Type of call to schedule'),
        scheduledFor: z.string().datetime().describe('ISO 8601 datetime when call should occur'),
        customInstructions: z.string().optional().describe('Custom instructions for the call agent')
      },
      async (args) => {
        try {
          const { data, error } = await supabase
            .from('scheduled_calls')
            .insert({
              user_id: args.userId,
              call_type: args.callType,
              scheduled_for: args.scheduledFor,
              custom_instructions: args.customInstructions,
              created_by: 'sdk-agent',
              status: 'pending'
            })
            .select()
            .single();

          if (error) {
            throw new Error(`Database error: ${error.message}`);
          }

          return {
            content: [{
              type: 'text',
              text: `✓ Scheduled ${args.callType} call for ${args.scheduledFor}\nCall ID: ${data.id}\nStatus: ${data.status}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `✗ Failed to schedule call: ${error.message}`
            }]
          };
        }
      }
    ),
    tool(
      'update_user_insights',
      'Update learned patterns and insights about user',
      {
        userId: z.string().uuid().describe('User UUID'),
        insights: z.object({
          patterns: z.array(z.string()).optional().describe('Behavioral patterns detected'),
          preferences: z.array(z.string()).optional().describe('User preferences learned'),
          goals: z.array(z.string()).optional().describe('User goals identified'),
          behaviors: z.record(z.any()).optional().describe('Specific behavior data')
        }).describe('Insights to merge with existing user data')
      },
      async (args) => {
        try {
          // Fetch current insights
          const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('insights')
            .eq('id', args.userId)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch user: ${fetchError.message}`);
          }

          // Merge new insights with existing
          const currentInsights = user.insights || {
            patterns: [],
            preferences: [],
            goals: [],
            behaviors: {}
          };

          const updatedInsights = {
            patterns: [...new Set([
              ...(currentInsights.patterns || []),
              ...(args.insights.patterns || [])
            ])],
            preferences: [...new Set([
              ...(currentInsights.preferences || []),
              ...(args.insights.preferences || [])
            ])],
            goals: [...new Set([
              ...(currentInsights.goals || []),
              ...(args.insights.goals || [])
            ])],
            behaviors: {
              ...(currentInsights.behaviors || {}),
              ...(args.insights.behaviors || {})
            },
            lastUpdated: new Date().toISOString()
          };

          // Update user record
          const { error: updateError } = await supabase
            .from('users')
            .update({ insights: updatedInsights })
            .eq('id', args.userId);

          if (updateError) {
            throw new Error(`Failed to update insights: ${updateError.message}`);
          }

          const summary = [
            `✓ User insights updated`,
            `Patterns: ${updatedInsights.patterns.length} total`,
            `Preferences: ${updatedInsights.preferences.length} total`,
            `Goals: ${updatedInsights.goals.length} total`,
            `Last updated: ${updatedInsights.lastUpdated}`
          ].join('\n');

          return {
            content: [{
              type: 'text',
              text: summary
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `✗ Failed to update insights: ${error.message}`
            }]
          };
        }
      }
    )
  ]
});

export default choreTrackerServer;
