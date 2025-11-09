/**
 * Helper functions for querying call_sessions
 * Provides convenient methods for common call history queries
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get recent call history for a user
 * @param {string} userId - User UUID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Call sessions
 */
async function getRecentCallHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select(`
      id,
      direction,
      call_type,
      status,
      briefing,
      conversation_summary,
      outcome_assessment,
      scheduled_for,
      started_at,
      completed_at,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get effectiveness metrics for Claude SDK interventions
 * @param {string} userId - Optional user UUID to filter by
 * @returns {Promise<Object>} Metrics by call type
 */
async function getInterventionEffectiveness(userId = null) {
  let query = supabase
    .from('call_sessions')
    .select('call_type, outcome_assessment')
    .eq('direction', 'outbound')
    .eq('scheduled_by', 'claude-sdk')
    .not('outcome_assessment', 'is', null);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by call_type and effectiveness
  const metrics = {};
  data.forEach(session => {
    const type = session.call_type;
    if (!metrics[type]) {
      metrics[type] = {
        total: 0,
        goal_achieved: 0,
        high_effectiveness: 0,
        medium_effectiveness: 0,
        low_effectiveness: 0
      };
    }

    metrics[type].total++;
    if (session.outcome_assessment.goal_achieved) {
      metrics[type].goal_achieved++;
    }

    const effectiveness = session.outcome_assessment.effectiveness;
    if (effectiveness === 'high') metrics[type].high_effectiveness++;
    else if (effectiveness === 'medium') metrics[type].medium_effectiveness++;
    else if (effectiveness === 'low') metrics[type].low_effectiveness++;
  });

  return metrics;
}

/**
 * Get calls that need follow-up
 * @param {string} userId - Optional user UUID to filter by
 * @returns {Promise<Array>} Sessions needing follow-up
 */
async function getCallsNeedingFollowUp(userId = null) {
  let query = supabase
    .from('call_sessions')
    .select('*')
    .eq('status', 'completed')
    .not('outcome_assessment', 'is', null);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter for those with follow_up_needed = true
  return data.filter(session =>
    session.outcome_assessment?.follow_up_needed === true
  );
}

/**
 * Get session by interaction ID
 * @param {string} interactionId - Interaction UUID
 * @returns {Promise<Object>} Call session
 */
async function getSessionByInteractionId(interactionId) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('interaction_id', interactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get user's call success rate
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Success rate statistics
 */
async function getUserCallSuccessRate(userId) {
  const { data, error } = await supabase
    .from('call_sessions')
    .select('outcome_assessment')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('outcome_assessment', 'is', null);

  if (error) throw error;

  if (data.length === 0) {
    return { total: 0, successful: 0, rate: 0 };
  }

  const successful = data.filter(s => s.outcome_assessment.goal_achieved).length;

  return {
    total: data.length,
    successful,
    rate: successful / data.length
  };
}

module.exports = {
  getRecentCallHistory,
  getInterventionEffectiveness,
  getCallsNeedingFollowUp,
  getSessionByInteractionId,
  getUserCallSuccessRate
};
