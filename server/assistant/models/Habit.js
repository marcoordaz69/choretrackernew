/**
 * Habit Model - Supabase PostgreSQL
 */

const { supabase } = require('../config/supabase');

class Habit {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Create new habit
   */
  static async create(habitData) {
    const { data, error } = await supabase
      .from('habits')
      .insert([{
        user_id: habitData.userId,
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'other',
        frequency: habitData.frequency || 'daily',
        target_days: habitData.targetDays || [],
        reminder_time: habitData.reminderTime,
        is_quantifiable: habitData.isQuantifiable || false,
        unit: habitData.unit,
        target_value: habitData.targetValue,
        streak: habitData.streak || { current: 0, longest: 0, lastCompleted: null },
        active: true
      }])
      .select()
      .single();

    if (error) throw error;

    return new Habit(data);
  }

  /**
   * Find habits by user ID
   */
  static async findByUserId(userId, activeOnly = true) {
    let query = supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(habit => new Habit(habit));
  }

  /**
   * Find habit by ID
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? new Habit(data) : null;
  }

  /**
   * Find habit by name (fuzzy match)
   */
  static async findByName(userId, habitName) {
    const habits = await this.findByUserId(userId, true);

    // Try case-insensitive fuzzy match
    const nameToMatch = habitName.toLowerCase();
    return habits.find(h =>
      h.name.toLowerCase().includes(nameToMatch) ||
      nameToMatch.includes(h.name.toLowerCase())
    ) || null;
  }

  /**
   * Log habit completion
   */
  async logCompletion(value = null, notes = '') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Insert or update habit log
    const { error: logError } = await supabase
      .from('habit_logs')
      .upsert({
        habit_id: this.id,
        user_id: this.user_id,
        date: today.toISOString().split('T')[0],
        completed: true,
        value: value,
        notes: notes
      }, {
        onConflict: 'habit_id,date'
      });

    if (logError) throw logError;

    // Update streak
    await this.updateStreak();
  }

  /**
   * Get habit logs
   */
  async getLogs(limit = 30) {
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', this.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data;
  }

  /**
   * Update streak
   */
  async updateStreak() {
    // Get completed logs
    const { data: logs, error } = await supabase
      .from('habit_logs')
      .select('date')
      .eq('habit_id', this.id)
      .eq('completed', true)
      .order('date', { ascending: false });

    if (error) throw error;

    if (logs.length === 0) {
      this.streak = { current: 0, longest: 0, lastCompleted: null };
      await this.save();
      return;
    }

    // Calculate current streak
    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < logs.length - 1; i++) {
      const currentDate = new Date(logs[i].date);
      const nextDate = new Date(logs[i + 1].date);
      const diffDays = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    const currentStreak = this.streak || {};
    this.streak = {
      current: streak,
      longest: Math.max(currentStreak.longest || 0, streak),
      lastCompleted: logs[0].date
    };

    await this.save();
  }

  /**
   * Update habit
   */
  async save() {
    const { data, error } = await supabase
      .from('habits')
      .update({
        name: this.name,
        description: this.description,
        category: this.category,
        frequency: this.frequency,
        target_days: this.target_days,
        reminder_time: this.reminder_time,
        is_quantifiable: this.is_quantifiable,
        unit: this.unit,
        target_value: this.target_value,
        streak: this.streak,
        active: this.active
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }
}

module.exports = Habit;
