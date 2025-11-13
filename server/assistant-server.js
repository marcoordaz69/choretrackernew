/**
 * Personal Assistant Server
 * SMS + Voice AI Life Coach
 *
 * A standalone server for the personal assistant that transforms lives through:
 * - SMS-first interaction (zero friction)
 * - Voice calls with OpenAI Realtime API
 * - Proactive check-ins and nudges
 * - Habit tracking, goal setting, task management
 * - AI-powered insights and coaching
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { testConnection } = require('./assistant/config/supabase');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhooks
app.use(morgan('dev'));

// SMS Terms & Consent page for Twilio compliance
app.get('/terms', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal Assistant - Terms of Use & SMS Consent</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 800px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
    }

    h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2em;
    }

    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 0.95em;
    }

    h2 {
      color: #764ba2;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
    }

    p, li {
      margin-bottom: 12px;
      color: #444;
    }

    ul {
      margin-left: 20px;
      margin-bottom: 20px;
    }

    .highlight {
      background: #f0f0ff;
      padding: 20px;
      border-left: 4px solid #667eea;
      margin: 25px 0;
      border-radius: 4px;
    }

    .highlight strong {
      color: #667eea;
    }

    .contact {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #888;
      font-size: 0.9em;
    }

    @media (max-width: 600px) {
      .container {
        padding: 25px;
        margin: 20px auto;
      }

      h1 {
        font-size: 1.6em;
      }

      h2 {
        font-size: 1.3em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Personal Assistant Service</h1>
    <p class="subtitle">Terms of Use & SMS Messaging Consent</p>

    <h2>Service Description</h2>
    <p>
      Welcome to your Personal Assistant! This service provides AI-powered life coaching and task management
      through SMS messaging and voice calls. Our assistant helps you:
    </p>
    <ul>
      <li>Track habits and achieve goals</li>
      <li>Manage tasks with smart reminders</li>
      <li>Daily check-ins and reflections</li>
      <li>Personalized productivity insights</li>
      <li>Conversational assistance via SMS and phone</li>
    </ul>

    <h2>SMS Messaging Consent</h2>

    <div class="highlight">
      <p><strong>By using this service, you consent to receive SMS text messages</strong> from our personal
      assistant service. These messages may include:</p>
      <ul>
        <li>Task reminders and notifications</li>
        <li>Daily check-ins and habit tracking prompts</li>
        <li>Responses to your questions and requests</li>
        <li>Goal progress updates and insights</li>
        <li>System notifications and service updates</li>
      </ul>
    </div>

    <p><strong>Message Frequency:</strong> Messages will be sent as needed based on your requests, scheduled
    reminders, and configured check-in times. Frequency varies depending on your usage and preferences.</p>

    <p><strong>Message and Data Rates:</strong> Standard message and data rates may apply. Please check with
    your mobile carrier for details about your plan.</p>

    <h2>Opt-Out & Privacy</h2>

    <p><strong>To Unsubscribe:</strong> You can opt out of receiving messages at any time by texting
    <strong>STOP</strong> to our service number. You will receive a confirmation message, and no further
    messages will be sent.</p>

    <p><strong>To Resubscribe:</strong> If you've opted out and want to receive messages again, text
    <strong>START</strong> to our service number.</p>

    <p><strong>For Help:</strong> Text <strong>HELP</strong> for assistance or contact information.</p>

    <p><strong>Privacy:</strong> We respect your privacy. Your messages and personal information are kept
    confidential and are not shared with third parties except as necessary to provide the service or as
    required by law.</p>

    <div class="contact">
      <h2>Contact & Support</h2>
      <p>If you have questions about this service or need assistance:</p>
      <ul>
        <li><strong>Text:</strong> Reply to any message from our service</li>
        <li><strong>Email:</strong> support@yourdomain.com</li>
      </ul>
      <p>We're here to help make your life easier!</p>
    </div>

    <div class="footer">
      <p>Last Updated: October 2025</p>
      <p>Personal Assistant Service - Transforming Lives Through AI</p>
    </div>
  </div>
</body>
</html>
  `;

  res.send(html);
});

// Alternate route alias for SMS consent
app.get('/sms-consent', (req, res) => {
  res.redirect(301, '/terms');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Personal Assistant',
    timestamp: new Date().toISOString()
  });
});

// Diagnostic endpoint to debug Railway environment
app.get('/debug/env', async (req, res) => {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  const diagnostics = {};

  try {
    // 1. Node.js version
    try {
      diagnostics.nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    } catch (error) {
      diagnostics.nodeVersion = { error: error.message };
    }

    // 2. Working directory
    diagnostics.workingDirectory = process.cwd();

    // 3. PATH
    diagnostics.pathDirectories = process.env.PATH.split(':');

    // 4. Check local claude CLI
    const localClaudePath = path.join(process.cwd(), 'node_modules', '.bin', 'claude');
    try {
      const exists = fs.existsSync(localClaudePath);
      const stats = exists ? fs.lstatSync(localClaudePath) : null;

      diagnostics.localClaude = {
        exists,
        path: localClaudePath,
        type: stats ? (stats.isSymbolicLink() ? 'symlink' : 'file') : null
      };

      if (exists && stats.isSymbolicLink()) {
        const target = fs.readlinkSync(localClaudePath);
        const targetPath = path.resolve(path.dirname(localClaudePath), target);
        diagnostics.localClaude.linkTarget = target;
        diagnostics.localClaude.resolvedPath = targetPath;
        diagnostics.localClaude.targetExists = fs.existsSync(targetPath);
      }

      if (exists) {
        try {
          fs.accessSync(localClaudePath, fs.constants.X_OK);
          diagnostics.localClaude.executable = true;
        } catch {
          diagnostics.localClaude.executable = false;
        }
      }
    } catch (error) {
      diagnostics.localClaude = { error: error.message };
    }

    // 5. Check package installation
    const packagePath = path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-code');
    try {
      diagnostics.claudeCodePackage = {
        exists: fs.existsSync(packagePath),
        path: packagePath
      };

      if (diagnostics.claudeCodePackage.exists) {
        const cliPath = path.join(packagePath, 'cli.js');
        diagnostics.claudeCodePackage.cliExists = fs.existsSync(cliPath);

        const pkgJsonPath = path.join(packagePath, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          diagnostics.claudeCodePackage.version = pkg.version;
        }
      }
    } catch (error) {
      diagnostics.claudeCodePackage = { error: error.message };
    }

    // 6. Try to run claude
    try {
      const result = execSync(`"${localClaudePath}" --version 2>&1`, {
        encoding: 'utf8',
        timeout: 5000
      });
      diagnostics.claudeExecution = {
        success: true,
        output: result.trim()
      };
    } catch (error) {
      diagnostics.claudeExecution = {
        success: false,
        exitCode: error.status,
        output: error.stdout || error.stderr || error.message
      };
    }

    // 7. Check ANTHROPIC_API_KEY
    if (process.env.ANTHROPIC_API_KEY) {
      const key = process.env.ANTHROPIC_API_KEY;
      diagnostics.anthropicApiKey = {
        set: true,
        masked: key.substring(0, 12) + '...' + key.substring(key.length - 8),
        length: key.length
      };
    } else {
      diagnostics.anthropicApiKey = { set: false };
    }

    // 8. Which command
    try {
      const which = execSync('which claude 2>&1', { encoding: 'utf8' }).trim();
      diagnostics.whichClaude = which;
    } catch {
      diagnostics.whichClaude = 'not found';
    }

    // 9. @anthropic-ai packages
    const anthropicDir = path.join(process.cwd(), 'node_modules', '@anthropic-ai');
    try {
      if (fs.existsSync(anthropicDir)) {
        diagnostics.anthropicPackages = fs.readdirSync(anthropicDir);
      } else {
        diagnostics.anthropicPackages = 'directory not found';
      }
    } catch (error) {
      diagnostics.anthropicPackages = { error: error.message };
    }

    res.json({
      timestamp: new Date().toISOString(),
      diagnostics
    });
  } catch (error) {
    res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Supabase PostgreSQL connection
console.log('Testing Supabase connection...');
testConnection()
  .then((success) => {
    if (!success) {
      console.error('Failed to connect to Supabase. Check your credentials.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('✗ Supabase connection error:', err);
    process.exit(1);
  });

// Create HTTP server first (needed for WebSocket)
const server = http.createServer(app);

// Initialize Personal Assistant with WebSocket support
const { initializeAssistant, shutdownAssistant } = require('./assistant');
initializeAssistant(app, server);

// Add WebSocket upgrade error logging
server.on('upgrade', (request, socket, head) => {
  console.log('[WebSocket] Upgrade request received');
  console.log('[WebSocket] URL:', request.url);
  console.log('[WebSocket] Headers:', request.headers);
});

server.on('error', (error) => {
  console.error('[Server] Error:', error);
});

// Start server
// Railway provides PORT env var, fallback to ASSISTANT_PORT for local dev
const PORT = process.env.PORT || process.env.ASSISTANT_PORT || 5001;
server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🤖 Personal Assistant Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Port: ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('  Twilio Configuration:');
  console.log(`  - Account SID: ${process.env.TWILIO_ACCOUNT_SID ? '✓' : '✗'}`);
  console.log(`  - Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '✓' : '✗'}`);
  console.log(`  - Phone Number: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log('');
  console.log('  OpenAI Configuration:');
  console.log(`  - API Key: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
  console.log('');
  console.log('  Webhook Endpoints:');
  console.log(`  - SMS: ${process.env.DOMAIN || 'http://localhost:' + PORT}/assistant/webhooks/sms/incoming`);
  console.log(`  - Voice: ${process.env.DOMAIN || 'http://localhost:' + PORT}/assistant/webhooks/voice/incoming`);
  console.log('');
  console.log('  Status: Ready to transform lives 🚀');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  shutdownAssistant();
  server.close(() => {
    console.log('Server closed');
    console.log('Supabase connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  shutdownAssistant();
  server.close(() => {
    console.log('Server closed');
    console.log('Supabase connection closed');
    process.exit(0);
  });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
