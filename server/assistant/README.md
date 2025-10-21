# Personal Life Assistant

An AI-powered personal assistant that transforms lives through SMS + voice interaction. Zero friction, maximum impact.

## Philosophy

Most productivity apps fail because they add friction. This assistant works differently:

- **SMS-First**: Text to interact, no app to open
- **Voice Calls**: Deep conversations when you need them
- **Proactive**: It checks on you (morning/evening + smart nudges)
- **Holistic**: Tracks habits, goals, tasks, health - all connected
- **AI-Powered**: Learns your patterns, suggests optimizations
- **Zero Friction**: Thought → text → done in 5 seconds

## Features

### Core Capabilities

1. **Task Management**
   - Natural language task creation
   - Priority-based organization
   - Smart reminders

2. **Habit Tracking**
   - Automatic streak tracking
   - Time-based reminders
   - Celebration of milestones

3. **Goal Setting**
   - Long-term goal decomposition
   - Progress tracking
   - Milestone management

4. **Daily Check-Ins**
   - Morning briefing (7 AM by default)
   - Evening reflection (9 PM by default)
   - Customizable timing

5. **Health Metrics**
   - Sleep quality tracking
   - Mood and energy levels
   - Exercise logging

6. **AI Coaching**
   - Pattern recognition
   - Personalized suggestions
   - Emotional support

7. **Voice Journaling**
   - Call your assistant anytime
   - Deep reflections via voice
   - AI-powered conversation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        USER                             │
│                  (SMS / Voice Call)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    TWILIO                               │
│              (SMS + Voice Gateway)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               EXPRESS SERVER                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Webhook Routes                                  │   │
│  │  - /assistant/webhooks/sms/incoming              │   │
│  │  - /assistant/webhooks/voice/incoming            │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Services                                        │   │
│  │  - AI Service (OpenAI GPT-4)                     │   │
│  │  - Twilio Service                                │   │
│  │  - Voice Service (Realtime API)                  │   │
│  │  - Scheduler (Cron Jobs)                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    MONGODB                              │
│  - Users, Habits, Goals, Tasks                          │
│  - Interactions, Daily Check-ins                        │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 16+
- MongoDB
- Twilio account (with SMS + Voice enabled)
- OpenAI API key
- Ngrok (for development) or public domain (for production)

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp server/assistant/.env.example .env
   # Edit .env with your credentials
   ```

3. **Configure Twilio**
   - Get phone number: https://console.twilio.com/
   - Configure webhooks:
     - SMS: `https://your-domain.com/assistant/webhooks/sms/incoming`
     - Voice: `https://your-domain.com/assistant/webhooks/voice/incoming`

4. **Start the server**
   ```bash
   # Development
   npm run assistant:dev

   # Production
   npm run assistant:start
   ```

### Development Setup with Ngrok

```bash
# Terminal 1: Start ngrok
ngrok http 5001

# Terminal 2: Update .env with ngrok URL
DOMAIN=https://your-ngrok-url.ngrok.io

# Terminal 3: Start server
npm run assistant:dev
```

## Usage

### User Onboarding

1. User texts your Twilio number
2. Assistant asks for their name
3. Onboarding complete → ready to use

### Example Interactions

**Task Creation:**
```
User: "Remind me to call mom tomorrow"
Assistant: "Got it! Added to your tasks. 📝"
```

**Habit Logging:**
```
User: "gym done, 45 mins"
Assistant: "💪 Crushed it! 16 day streak. You're unstoppable!"
```

**Goal Setting:**
```
User: "goal: lose 10 lbs by june"
Assistant: "Love it! That's 2 lbs/month. I'll track your progress. 🎯"
```

**Morning Check-In (Automatic at 7 AM):**
```
Assistant: "Good morning! How'd you sleep? (1-10)"
User: "8"
Assistant: "Awesome! 📅 Today's Focus:
1. Finish proposal
2. Gym at 6pm
3. Call mom

Ready to crush it? 💪"
```

**Evening Reflection (Automatic at 9 PM):**
```
Assistant: "Daily reflection time! Call you for 2 mins? (Y/N)"
User: "y"
[Phone rings - 2 min voice reflection]
```

## Configuration

### User Preferences

Users can customize:
- Check-in times (morning/evening)
- Nudge frequency (off/gentle/moderate/aggressive)
- Voice vs. text preference
- Quiet hours
- AI personality (supportive/direct/humorous)

### Proactive Features

**Morning Briefing** (Daily)
- Sleep quality question
- Today's top 3 priorities
- Habit reminders
- Weather (if integrated)

**Evening Reflection** (Daily)
- Day rating (1-10)
- What went well
- What to improve
- Tomorrow's top 3

**Smart Nudges** (Throughout day)
- Habit reminders (at scheduled times)
- Task deadline alerts (1 hour before)
- Movement reminders (after 2 hours sitting)
- Pattern-based suggestions

## API Endpoints

### SMS Webhooks

**POST /assistant/webhooks/sms/incoming**
- Handles incoming SMS messages
- Processes with AI
- Sends response

**POST /assistant/webhooks/sms/status**
- Handles delivery status callbacks

### Voice Webhooks

**POST /assistant/webhooks/voice/incoming**
- Handles incoming voice calls
- Returns TwiML with WebSocket stream

**WS /assistant/voice/stream**
- WebSocket for OpenAI Realtime API
- Bidirectional audio streaming

## Database Models

### User
- Phone number, name, email
- Preferences (check-in times, nudge settings)
- AI context (personality, learning data)
- Subscription tier

### Interaction
- All SMS/voice interactions
- Transcripts, metadata
- Intent classification

### Habit
- Name, category, frequency
- Streak tracking
- Completion logs

### Goal
- Title, category, timeframe
- Progress tracking
- Milestones

### Task
- Title, priority, status
- Due dates, reminders
- Related goals

### DailyCheckIn
- Morning: sleep, mood, energy
- Evening: day rating, wins, learnings
- Health metrics

## Deployment

### Production Checklist

- [ ] Set up production MongoDB (MongoDB Atlas)
- [ ] Get production Twilio number
- [ ] Configure Twilio webhooks with production domain
- [ ] Set environment variables in production
- [ ] Enable HTTPS (required for Twilio webhooks)
- [ ] Set up monitoring (logs, errors)
- [ ] Configure auto-restart (PM2, systemd)

### Deployment Options

**Option 1: Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Option 2: Heroku**
```bash
# Create app
heroku create your-assistant-app

# Set env vars
heroku config:set TWILIO_ACCOUNT_SID=xxx
heroku config:set TWILIO_AUTH_TOKEN=xxx
# ... etc

# Deploy
git push heroku main
```

**Option 3: VPS (DigitalOcean, AWS, etc.)**
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start server/assistant-server.js --name personal-assistant
pm2 save
pm2 startup
```

## Monitoring

**Key Metrics to Track:**
- Message volume (daily)
- Response times
- User engagement (morning/evening check-in completion)
- Habit streak averages
- Goal completion rates
- Voice call duration

**Logs to Monitor:**
- Twilio webhook errors
- OpenAI API failures
- Database connection issues
- Scheduler job execution

## Costs (Estimated)

**Per Active User / Month:**
- Twilio SMS: ~$3.30 (15 msgs/day)
- Twilio Voice: ~$1.80 (5 mins/day)
- OpenAI API: ~$2.00 (GPT-4o-mini)
- **Total: ~$7/user/month**

**At Scale:**
- 100 users: $700/month
- 1,000 users: $7,000/month
- 10,000 users: $70,000/month

**Optimization:**
- Use GPT-4o-mini for SMS (cheaper)
- Cache common responses
- Batch AI calls where possible
- Tiered pricing for users

## Roadmap

### Phase 1 (MVP) ✅
- SMS interaction
- Basic AI processing
- Task/habit/goal tracking
- Morning/evening check-ins

### Phase 2 (Voice)
- OpenAI Realtime API integration
- Voice journaling
- Outbound reflection calls

### Phase 3 (Intelligence)
- Pattern recognition
- Smart nudges
- Predictive scheduling
- Weekly analytics

### Phase 4 (Integrations)
- Calendar sync (Google, Outlook)
- Health apps (Apple Health, Fitbit)
- Financial tracking
- Email summaries

### Phase 5 (Dashboard)
- Web interface
- Visualizations
- Settings management
- Family/team accounts

## Troubleshooting

**SMS not working:**
- Check Twilio webhook URL is correct
- Verify public HTTPS endpoint
- Check Twilio credentials in .env
- Review Twilio debugger logs

**Voice calls not connecting:**
- Ensure WebSocket endpoint is accessible
- Verify OpenAI API key is valid
- Check ngrok is running (dev)
- Review WebSocket logs

**AI responses slow:**
- Check OpenAI API status
- Review token usage (reduce if needed)
- Consider caching common responses

**Scheduled jobs not running:**
- Verify server timezone settings
- Check cron expressions
- Review scheduler logs

## Support

For issues or questions:
- GitHub Issues: [Link to repo]
- Email: support@yourapp.com
- Docs: https://docs.yourapp.com

## License

MIT License - See LICENSE file

---

**Built with:**
- Node.js + Express
- MongoDB + Mongoose
- Twilio (SMS + Voice)
- OpenAI GPT-4 + Realtime API
- Love for transforming lives ❤️
