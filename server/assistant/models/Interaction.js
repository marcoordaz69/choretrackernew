/**
 * Interaction Model - Supabase PostgreSQL
 */

const { supabase } = require('../config/supabase');

class Interaction {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Create new interaction
   */
  static async create(interactionData) {
    const { data, error } = await supabase
      .from('interactions')
      .insert([{
        user_id: interactionData.userId,
        type: interactionData.type,
        direction: interactionData.direction,
        content: interactionData.content || {},
        metadata: interactionData.metadata || {},
        timestamp: interactionData.timestamp || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return new Interaction(data);
  }

  /**
   * Find interactions by user ID
   */
  static async findByUserId(userId, limit = 10) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(interaction => new Interaction(interaction));
  }

  /**
   * Find recent interactions
   */
  static async findRecent(userId, limit = 10) {
    return this.findByUserId(userId, limit);
  }

  /**
   * Find by type
   */
  static async findByType(userId, type, limit = 10) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(interaction => new Interaction(interaction));
  }

  /**
   * Get interaction count for user
   */
  static async countByUserId(userId) {
    const { count, error } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;

    return count;
  }

  /**
   * Find interactions within date range
   */
  static async findByDateRange(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return data.map(interaction => new Interaction(interaction));
  }

  /**
   * Update interaction
   */
  async save() {
    const { data, error } = await supabase
      .from('interactions')
      .update({
        content: this.content,
        metadata: this.metadata
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }
}

module.exports = Interaction;
