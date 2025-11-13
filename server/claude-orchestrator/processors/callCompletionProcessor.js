import { query } from '@anthropic-ai/claude-agent-sdk';
import { SessionManager } from '../session-manager.js';
import { createClient } from '@supabase/supabase-js';

const sessionManager = new SessionManager();

// Supabase client for logging
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process call completion with Claude SDK
 * @param {object} interaction - Interaction record from database
 * @param {object} mcpServers - MCP servers to provide to Claude
 */
export async function processCallCompletion(interaction, mcpServers) {
  const { user_id, call_type, transcript, id } = interaction;

  console.log(`\n[PROCESSOR] Starting analysis for interaction ${id}`);
  console.log(`[PROCESSOR] User: ${user_id}`);
  console.log(`[PROCESSOR] Call type: ${call_type}`);

  // Find associated call_session (if exists)
  const { data: callSession, error: sessionError } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('interaction_id', id)
    .maybeSingle();

  if (sessionError) {
    console.error('[PROCESSOR] Error querying call_sessions:', sessionError);
  }

  if (callSession) {
    console.log(`[PROCESSOR] Found call session: ${callSession.id}`);
    if (callSession.briefing) {
      console.log(`[PROCESSOR] Session has briefing: ${callSession.briefing.trigger_reason}`);
    }
  }

  // Get or create session for this user
  const sessionId = await sessionManager.getOrCreateSession(user_id);

  // Build streaming prompt with context
  async function* contextGenerator() {
    let briefingContext = '';

    if (callSession?.briefing) {
      briefingContext = `
ORIGINAL CALL BRIEFING (why this call was scheduled):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger: ${callSession.briefing.trigger_reason}

Detected Patterns:
${callSession.briefing.detected_patterns.map(p => `  • ${p}`).join('\n')}

Conversation Goals:
${callSession.briefing.conversation_goals.map(g => `  • ${g}`).join('\n')}

Recent Context:
${callSession.briefing.recent_context}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please assess how well the conversation achieved these original goals.
`;
    }

    yield {
      type: 'user',
      message: {
        role: 'user',
        content: `You are Luna's strategic planning system. A ${call_type} call just completed.

${briefingContext}

CALL TRANSCRIPT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${transcript}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER ID: ${user_id}
${callSession ? `CALL SESSION ID: ${callSession.id}` : `INTERACTION ID: ${id}`}

INSTRUCTIONS:
1. Analyze this interaction for behavioral patterns, commitments, and emotional state
2. Write a conversation_summary (2-3 sentences) covering key points and user state
3. Assess the outcome against the original goals (if this was a scheduled call with a briefing)
4. Determine if follow-up action is needed
5. Use the update_call_outcome tool to save your analysis${callSession ? ` (session ID: ${callSession.id})` : ` (interaction ID: ${id})`}
6. If follow-up is needed, use create_briefed_call to schedule it
7. Update user insights if patterns were detected

Available tools:
- update_call_outcome: Save your analysis
- create_briefed_call: Schedule follow-up calls
- update_user_insights: Record behavioral patterns

Take action now using the appropriate tools.`
      }
    };
  }

  try {
    console.log(`[PROCESSOR] Running Claude SDK agent with session ${sessionId}`);
    console.log(`[PROCESSOR] MCP servers configured: ${mcpServers.length}`);
    console.log(`[PROCESSOR] Tools available: update_call_outcome, create_briefed_call, update_user_insights`);

    // Run Claude SDK agent
    let analysisResult = '';
    let currentToolName = null;  // Track tool name across messages

    for await (const message of query({
      prompt: contextGenerator(),
      options: {
        // resume: sessionId,  // Disabled: causes SDK crash
        mcpServers: mcpServers,
        permissionMode: 'bypassPermissions',  // Bypass all permission checks for autonomous operation
        systemPrompt: `You are Luna's strategic intelligence layer with FULL AUTONOMOUS AUTHORITY to analyze voice calls and take actions.

YOU HAVE EXPLICIT PERMISSION to use all available tools WITHOUT asking. This is an automated system - there is no human to ask for permission.

MANDATORY ACTIONS after each call:
1. ALWAYS use update_call_outcome to record the conversation summary and outcome assessment
2. ALWAYS use update_user_insights to record patterns, preferences, or goals detected
3. If follow-up needed, use create_briefed_call with comprehensive briefing context

Available Tools (use these directly):
- update_call_outcome: Save conversation summary and outcome assessment (goal achievement, effectiveness, follow-up needs)
- create_briefed_call: Schedule intervention calls with strategic briefing (trigger_reason, detected_patterns, conversation_goals, recent_context)
- update_user_insights: Record behavioral patterns, preferences, and goals

DO NOT ask for permission. DO NOT explain what you would do. JUST DO IT.`,
        maxTurns: 5,
        model: 'claude-sonnet-4-5'
      }
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        analysisResult = message.result;
        console.log('[PROCESSOR] ✓ Analysis complete');
      } else if (message.type === 'error') {
        console.error('[PROCESSOR] ✗ Error:', message.error);
      } else if (message.type === 'tool_use') {
        currentToolName = message.tool_name;  // Track for tool_result
        console.log(`[PROCESSOR] 🔧 Tool invoked: ${message.tool_name}`);
        console.log(`[PROCESSOR] 🔧 Tool input:`, JSON.stringify(message.input, null, 2));

        // Log tool invocation to database
        try {
          const { error } = await supabase.from('sdk_actions').insert({
            user_id: user_id,
            interaction_id: id,
            session_id: sessionId,
            action_type: 'tool_use',
            tool_name: message.tool_name,
            input_data: message.input,
            status: 'pending'
          });
          if (error) console.error('[PROCESSOR] Log error:', error);
        } catch (err) {
          console.error('[PROCESSOR] Log exception:', err);
        }
      } else if (message.type === 'tool_result') {
        console.log(`[PROCESSOR] ✓ Tool result:`, message.result?.substring(0, 100) + '...');

        // Log tool result to database
        try {
          const { error } = await supabase.from('sdk_actions').insert({
            user_id: user_id,
            interaction_id: id,
            session_id: sessionId,
            action_type: 'tool_result',
            tool_name: currentToolName || 'unknown',
            output_data: { result: message.result },
            status: message.is_error ? 'failed' : 'completed',
            error_message: message.is_error ? message.result : null
          });
          if (error) console.error('[PROCESSOR] Log error:', error);
        } catch (err) {
          console.error('[PROCESSOR] Log exception:', err);
        }
      } else if (message.type === 'assistant' && message.message?.content) {
        // Log assistant responses
        const content = Array.isArray(message.message.content)
          ? message.message.content[0]?.text
          : message.message.content;
        console.log('[PROCESSOR] Claude:', content?.substring(0, 100) + '...');
      }
    }

    // Update session timestamp
    await sessionManager.updateSessionTimestamp(user_id);

    console.log('[PROCESSOR] ✓ Processing complete\n');
    return analysisResult;

  } catch (error) {
    console.error('[PROCESSOR] ✗ Failed:', error.message);
    throw error;
  }
}

export default processCallCompletion;
