/**
 * DailyCheckIn Model - Supabase PostgreSQL
 */

const { supabase } = require('../config/supabase');

class DailyCheckIn {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Get or create today's check-in for user
   */
  static async getTodayCheckIn(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = today.toISOString().split('T')[0];

    // Try to find existing check-in
    const { data: existing, error: findError } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }

    if (existing) {
      return new DailyCheckIn(existing);
    }

    // Create new check-in
    const { data, error } = await supabase
      .from('daily_checkins')
      .insert([{
        user_id: userId,
        date: dateStr
      }])
      .select()
      .single();

    if (error) throw error;

    return new DailyCheckIn(data);
  }

  /**
   * Find check-ins by user ID
   */
  static async findByUserId(userId, limit = 30) {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(checkin => new DailyCheckIn(checkin));
  }

  /**
   * Find check-ins for date range
   */
  static async findByDateRange(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map(checkin => new DailyCheckIn(checkin));
  }

  /**
   * Update morning check-in
   */
  async updateMorning(morningData) {
    const morning = {
      ...(this.morning || {}),
      completed: true,
      completedAt: new Date().toISOString(),
      ...morningData
    };

    this.morning = morning;
    await this.save();
  }

  /**
   * Update evening check-in
   */
  async updateEvening(eveningData) {
    const evening = {
      ...(this.evening || {}),
      completed: true,
      completedAt: new Date().toISOString(),
      ...eveningData
    };

    this.evening = evening;
    await this.save();
  }

  /**
   * Update metrics
   */
  async updateMetrics(metricsData) {
    this.metrics = {
      ...(this.metrics || {}),
      ...metricsData
    };

    await this.save();
  }

  /**
   * Update mood
   */
  async updateMood(moodData) {
    this.mood = {
      ...(this.mood || {}),
      ...moodData
    };

    await this.save();
  }

  /**
   * Save check-in
   */
  async save() {
    const { data, error } = await supabase
      .from('daily_checkins')
      .update({
        morning: this.morning,
        evening: this.evening,
        metrics: this.metrics,
        mood: this.mood
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }

  /**
   * Get completion status
   */
  getCompletionStatus() {
    return {
      morningCompleted: this.morning?.completed || false,
      eveningCompleted: this.evening?.completed || false,
      bothCompleted: (this.morning?.completed && this.evening?.completed) || false
    };
  }

  /**
   * Get streak of consecutive check-ins
   */
  static async getStreak(userId) {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('date, morning, evening')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(365);

    if (error) throw error;

    if (data.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < data.length; i++) {
      const checkin = data[i];
      const checkinDate = new Date(checkin.date);
      checkinDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      // Check if this is consecutive
      if (checkinDate.getTime() !== expectedDate.getTime()) {
        break;
      }

      // Check if both morning and evening completed
      if (checkin.morning?.completed && checkin.evening?.completed) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}

module.exports = DailyCheckIn;
