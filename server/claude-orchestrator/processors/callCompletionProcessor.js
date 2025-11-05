import { query } from '@anthropic-ai/claude-agent-sdk';
import { SessionManager } from '../session-manager.js';

const sessionManager = new SessionManager();

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

  // Get or create session for this user
  const sessionId = await sessionManager.getOrCreateSession(user_id);

  // Build streaming prompt with context
  async function* contextGenerator() {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: `You are Luna's strategic planning system. A ${call_type} call just completed.

CALL TRANSCRIPT:
"${transcript}"

USER ID: ${user_id}

INSTRUCTIONS:
1. Analyze this interaction for patterns, commitments, and emotional state
2. Determine if any proactive interventions are warranted
3. Use your tools to schedule calls or update insights if appropriate
4. Summarize your analysis and any actions taken

Use your available tools to take actions as needed.`
      }
    };
  }

  try {
    console.log(`[PROCESSOR] Running Claude SDK agent with session ${sessionId}`);

    // Run Claude SDK agent
    let analysisResult = '';

    for await (const message of query({
      prompt: contextGenerator(),
      options: {
        resume: sessionId,
        mcpServers: mcpServers,
        allowedTools: [
          'mcp__chore-tracker__schedule_call',
          'mcp__chore-tracker__update_user_insights'
        ],
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: `
You are Luna's strategic intelligence layer. You analyze voice calls to:
- Detect behavioral patterns
- Learn user preferences
- Schedule proactive interventions
- Build understanding over time

Be thoughtful and autonomous in your decisions.`
        },
        maxTurns: 5,
        model: 'claude-sonnet-4-5'
      }
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        analysisResult = message.result;
        console.log('[PROCESSOR] ✓ Analysis complete');
      } else if (message.type === 'error') {
        console.error('[PROCESSOR] ✗ Error:', message.error);
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
