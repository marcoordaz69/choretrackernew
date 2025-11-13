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
    ),
    tool(
      'create_briefed_call',
      'Schedule a voice call with comprehensive briefing for the voice agent',
      {
        userId: z.string().uuid().describe('UUID of the user to call'),
        callType: z.enum([
          'scolding',
          'motivational-wakeup',
          'task-reminder',
          'morning-briefing',
          'wind-down-reflection'
        ]).describe('Type of call to schedule'),
        scheduledFor: z.string().datetime().describe('ISO 8601 datetime when call should occur'),
        briefing: z.object({
          trigger_reason: z.string().describe('Why this call was scheduled'),
          detected_patterns: z.array(z.string()).describe('Behavioral patterns observed that led to scheduling'),
          conversation_goals: z.array(z.string()).describe('What the voice agent should accomplish in this call'),
          recent_context: z.string().describe('Relevant recent user state or events')
        }).describe('Strategic context for the voice agent')
      },
      async (args) => {
        try {
          const { userId, callType, scheduledFor, briefing } = args;

          const { data, error } = await supabase
            .from('call_sessions')
            .insert({
              user_id: userId,
              direction: 'outbound',
              call_type: callType,
              scheduled_for: scheduledFor,
              scheduled_by: 'claude-sdk',
              status: 'scheduled',
              briefing: briefing
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating briefed call:', error);
            throw new Error(`Failed to create call session: ${error.message}`);
          }

          console.log(`✓ Call session created: ${data.id} (${callType} at ${scheduledFor})`);
          console.log(`  Trigger: ${briefing.trigger_reason}`);

          return {
            content: [{
              type: 'text',
              text: `Call scheduled successfully!\n\nType: ${callType}\nScheduled for: ${scheduledFor}\nSession ID: ${data.id}\n\nBriefing:\n- Trigger: ${briefing.trigger_reason}\n- Patterns: ${briefing.detected_patterns.join(', ')}\n- Goals: ${briefing.conversation_goals.join(', ')}`
            }]
          };
        } catch (error) {
          console.error('Error in create_briefed_call:', error);
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
      'update_call_outcome',
      'Update call session with summary and outcome assessment after call completes',
      {
        sessionId: z.string().uuid().optional().describe('Call session ID (if known)'),
        interactionId: z.string().uuid().optional().describe('Interaction ID (alternative lookup)'),
        summary: z.string().describe('2-3 sentence summary of conversation: key points, commitments, emotional state'),
        outcome: z.object({
          goal_achieved: z.boolean().describe('Whether the conversation goals were accomplished'),
          effectiveness: z.enum(['high', 'medium', 'low']).describe('How effective was this intervention'),
          follow_up_needed: z.boolean().describe('Does this call require a follow-up'),
          follow_up_action: z.string().optional().describe('What follow-up action to take'),
          user_satisfaction: z.number().min(1).max(5).optional().describe('Estimated user satisfaction (1-5)')
        }).describe('Structured outcome assessment')
      },
      async (args) => {
        try {
          const { sessionId, interactionId, summary, outcome } = args;

          // Must provide at least one identifier
          if (!sessionId && !interactionId) {
            throw new Error('Must provide either sessionId or interactionId');
          }

          // Build where clause based on what's provided
          const whereClause = sessionId
            ? { id: sessionId }
            : { interaction_id: interactionId };

          const { data, error } = await supabase
            .from('call_sessions')
            .update({
              conversation_summary: summary,
              outcome_assessment: outcome,
              updated_at: new Date().toISOString()
            })
            .match(whereClause)
            .select()
            .single();

          if (error) {
            console.error('Error updating call outcome:', error);
            throw new Error(`Failed to update call session: ${error.message}`);
          }

          console.log(`✓ Call session ${data.id} updated with outcome`);
          console.log(`  Effectiveness: ${outcome.effectiveness}`);
          console.log(`  Goal achieved: ${outcome.goal_achieved}`);

          return {
            content: [{
              type: 'text',
              text: `Call outcome updated successfully!\n\nSession ID: ${data.id}\nSummary: ${summary}\n\nOutcome:\n- Goal achieved: ${outcome.goal_achieved}\n- Effectiveness: ${outcome.effectiveness}\n- Follow-up needed: ${outcome.follow_up_needed}`
            }]
          };
        } catch (error) {
          console.error('Error in update_call_outcome:', error);
          return {
            content: [{
              type: 'text',
              text: `✗ Failed to update call outcome: ${error.message}`
            }]
          };
        }
      }
    )
  ]
});

export default choreTrackerServer;
