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
    )
  ]
});

export default choreTrackerServer;
