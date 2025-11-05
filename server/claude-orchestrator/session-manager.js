import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Manage persistent Claude SDK sessions per user
 */
export class SessionManager {
  /**
   * Get or create session for user
   * @param {string} userId - User UUID
   * @returns {Promise<string>} Session ID
   */
  async getOrCreateSession(userId) {
    // Try to fetch existing session
    const { data: existing, error: fetchError } = await supabase
      .from('user_sessions')
      .select('session_id, last_active')
      .eq('user_id', userId)
      .single();

    if (existing && !fetchError) {
      console.log(`[SESSION] Resuming session for user ${userId}`);
      console.log(`[SESSION] Last active: ${existing.last_active}`);

      // Update last_active timestamp
      await this.updateSessionTimestamp(userId);

      return existing.session_id;
    }

    // Create new session
    console.log(`[SESSION] Creating new session for user ${userId}`);
    const sessionId = `session_${userId}_${Date.now()}`;

    const { error: insertError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        context_summary: {
          created: new Date().toISOString(),
          totalInteractions: 0
        }
      });

    if (insertError) {
      throw new Error(`Failed to create session: ${insertError.message}`);
    }

    console.log(`[SESSION] New session created: ${sessionId}`);
    return sessionId;
  }

  /**
   * Update session last_active timestamp
   * @param {string} userId - User UUID
   */
  async updateSessionTimestamp(userId) {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`[SESSION] Failed to update timestamp: ${error.message}`);
    }
  }

  /**
   * Update session context summary
   * @param {string} userId - User UUID
   * @param {object} summary - Context summary data
   */
  async updateContextSummary(userId, summary) {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        context_summary: summary,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`[SESSION] Failed to update context: ${error.message}`);
    } else {
      console.log(`[SESSION] Context updated for user ${userId}`);
    }
  }
}

export default SessionManager;
