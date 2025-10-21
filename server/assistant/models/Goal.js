/**
 * Goal Model - Supabase PostgreSQL
 */

const { supabase } = require('../config/supabase');

class Goal {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Create new goal
   */
  static async create(goalData) {
    const { data, error } = await supabase
      .from('goals')
      .insert([{
        user_id: goalData.userId,
        title: goalData.title,
        description: goalData.description,
        category: goalData.category || 'other',
        timeframe: goalData.timeframe,
        target_date: goalData.targetDate,
        status: goalData.status || 'active',
        progress: goalData.progress || 0,
        is_quantifiable: goalData.isQuantifiable || false,
        metric: goalData.metric || {},
        notes: goalData.notes || []
      }])
      .select()
      .single();

    if (error) throw error;

    // Create milestones if provided
    if (goalData.milestones && goalData.milestones.length > 0) {
      const milestonesData = goalData.milestones.map(m => ({
        goal_id: data.id,
        title: m.title,
        target_date: m.targetDate,
        completed: false
      }));

      await supabase.from('goal_milestones').insert(milestonesData);
    }

    return new Goal(data);
  }

  /**
   * Find goals by user ID
   */
  static async findByUserId(userId, status = null) {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(goal => new Goal(goal));
  }

  /**
   * Find active goals
   */
  static async findActive(userId) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(goal => new Goal(goal));
  }

  /**
   * Find goal by ID
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? new Goal(data) : null;
  }

  /**
   * Get milestones for this goal
   */
  async getMilestones() {
    const { data, error } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', this.id)
      .order('target_date', { ascending: true });

    if (error) throw error;

    return data;
  }

  /**
   * Get related habits
   */
  async getRelatedHabits() {
    const { data, error } = await supabase
      .from('goal_habits')
      .select('habit_id')
      .eq('goal_id', this.id);

    if (error) throw error;

    if (data.length === 0) return [];

    const habitIds = data.map(row => row.habit_id);
    const Habit = require('./Habit');
    const habits = await Promise.all(
      habitIds.map(id => Habit.findById(id))
    );

    return habits.filter(h => h !== null);
  }

  /**
   * Link a habit to this goal
   */
  async linkHabit(habitId) {
    const { error } = await supabase
      .from('goal_habits')
      .insert({ goal_id: this.id, habit_id: habitId });

    if (error && error.code !== '23505') { // 23505 = duplicate key
      throw error;
    }
  }

  /**
   * Update progress
   */
  async updateProgress() {
    if (this.is_quantifiable && this.metric && this.metric.target) {
      this.progress = Math.min(100, (this.metric.current / this.metric.target) * 100);
    }

    // Check if target date passed
    if (this.target_date && new Date() > new Date(this.target_date) && this.status === 'active') {
      this.status = 'paused'; // Could trigger a check-in
    }

    await this.save();
  }

  /**
   * Mark as completed
   */
  async complete() {
    this.status = 'completed';
    this.progress = 100;
    this.completed_at = new Date().toISOString();
    await this.save();
  }

  /**
   * Update goal
   */
  async save() {
    const { data, error } = await supabase
      .from('goals')
      .update({
        title: this.title,
        description: this.description,
        category: this.category,
        timeframe: this.timeframe,
        target_date: this.target_date,
        status: this.status,
        progress: this.progress,
        is_quantifiable: this.is_quantifiable,
        metric: this.metric,
        notes: this.notes,
        completed_at: this.completed_at
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }
}

module.exports = Goal;
