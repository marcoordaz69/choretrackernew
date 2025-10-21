/**
 * Task Model - Supabase PostgreSQL
 */

const { supabase } = require('../config/supabase');

class Task {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Create new task
   */
  static async create(taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: taskData.userId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        category: taskData.category || 'personal',
        due_date: taskData.dueDate,
        reminder_time: taskData.reminderTime,
        related_goal_id: taskData.relatedGoal,
        energy_level: taskData.energyLevel || 'medium',
        estimated_duration: taskData.estimatedDuration
      }])
      .select()
      .single();

    if (error) throw error;

    return new Task(data);
  }

  /**
   * Find tasks by user ID
   */
  static async findByUserId(userId, status = null) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(task => new Task(task));
  }

  /**
   * Find pending tasks
   */
  static async findPending(userId) {
    const { data, error} = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true });

    if (error) throw error;

    return data.map(task => new Task(task));
  }

  /**
   * Find tasks due today
   */
  static async findDueToday(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .neq('status', 'completed')
      .order('priority', { ascending: false });

    if (error) throw error;

    return data.map(task => new Task(task));
  }

  /**
   * Mark task as completed
   */
  async complete() {
    this.status = 'completed';
    this.completed_at = new Date().toISOString();
    await this.save();
  }

  /**
   * Update task
   */
  async save() {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: this.title,
        description: this.description,
        priority: this.priority,
        status: this.status,
        category: this.category,
        due_date: this.due_date,
        reminder_time: this.reminder_time,
        related_goal_id: this.related_goal_id,
        energy_level: this.energy_level,
        estimated_duration: this.estimated_duration,
        completed_at: this.completed_at
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }

  /**
   * Delete task
   */
  async delete() {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', this.id);

    if (error) throw error;
  }
}

module.exports = Task;
