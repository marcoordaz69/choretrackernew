/**
 * Supabase Client Configuration
 * PostgreSQL database client for Personal Assistant
 */

const { createClient } = require('@supabase/supabase-js');

// Extract Supabase URL and Key from connection string or environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be defined in environment variables');
  console.error('');
  console.error('Example:');
  console.error('  SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection function
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('assistant_users')
      .select('count')
      .limit(1);

    if (error) throw error;

    console.log('✓ Connected to Supabase PostgreSQL successfully');
    return true;
  } catch (error) {
    console.error('✗ Supabase connection error:', error.message);
    return false;
  }
}

module.exports = {
  supabase,
  testConnection
};
