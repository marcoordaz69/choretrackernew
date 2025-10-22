/**
 * User Model - Supabase PostgreSQL
 */

const { supabase } = require('../config/supabase');

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phone) {
    const { data, error } = await supabase
      .from('assistant_users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data ? new User(data) : null;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('assistant_users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? new User(data) : null;
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const { data, error } = await supabase
      .from('assistant_users')
      .insert([{
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        timezone: userData.timezone || 'America/New_York',
        preferences: userData.preferences || undefined,
        subscription: userData.subscription || undefined,
        ai_context: userData.aiContext || undefined,
        active: userData.active !== undefined ? userData.active : true,
        onboarded: userData.onboarded || false,
        sms_opted_out: userData.smsOptedOut || false
      }])
      .select()
      .single();

    if (error) throw error;

    return new User(data);
  }

  /**
   * Update user
   */
  async save() {
    const updateData = {
      name: this.name,
      email: this.email,
      timezone: this.timezone,
      preferences: this.preferences,
      subscription: this.subscription,
      ai_context: this.ai_context,
      active: this.active,
      onboarded: this.onboarded,
      sms_opted_out: this.smsOptedOut,
      last_active: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('assistant_users')
      .update(updateData)
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }

  /**
   * Check if user is in quiet hours
   */
  isInQuietHours() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.preferences?.quietHours || { start: '22:00', end: '07:00' };

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
  }

  /**
   * Increment message count
   */
  async incrementMessageCount() {
    const subscription = this.subscription || { messageCount: 0 };
    subscription.messageCount = (subscription.messageCount || 0) + 1;
    this.subscription = subscription;
    this.last_active = new Date().toISOString();

    await this.save();
  }

  /**
   * Find all users
   */
  static async findAll() {
    const { data, error } = await supabase
      .from('assistant_users')
      .select('*');

    if (error) throw error;

    return data.map(user => new User(user));
  }

  /**
   * Find all active users
   */
  static async findActive() {
    const { data, error } = await supabase
      .from('assistant_users')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    return data.map(user => new User(user));
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive() {
    const { error } = await supabase
      .from('assistant_users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', this.id);

    if (error) throw error;

    this.last_active = new Date().toISOString();
  }
}

module.exports = User;
