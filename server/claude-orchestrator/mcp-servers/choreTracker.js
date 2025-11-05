import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Chore Tracker MCP Server
 * Provides Claude with tools to interact with task management system
 */
export const choreTrackerServer = createSdkMcpServer({
  name: 'chore-tracker',
  version: '1.0.0',
  tools: [
    // Tools will be added in next tasks
  ]
});

export default choreTrackerServer;
