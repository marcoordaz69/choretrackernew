# Personal Assistant - Complete Setup Guide

This guide will walk you through setting up your AI-powered personal life assistant from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Twilio Setup](#twilio-setup)
3. [OpenAI Setup](#openai-setup)
4. [MongoDB Setup](#mongodb-setup)
5. [Local Development](#local-development)
6. [Production Deployment](#production-deployment)
7. [Testing](#testing)

---

## Prerequisites

### Required Accounts

1. **Twilio Account** (SMS + Voice)
   - Sign up: https://www.twilio.com/try-twilio
   - Free trial: $15 credit (enough for testing)
   - Cost: ~$5-7/user/month

2. **OpenAI Account** (GPT-4 API)
   - Sign up: https://platform.openai.com/signup
   - Requires: Credit card for API access
   - Cost: ~$2/user/month (GPT-4o-mini)

3. **MongoDB** (Database)
   - Option A: Local MongoDB (free)
   - Option B: MongoDB Atlas (free tier available)

### System Requirements

- Node.js 16 or higher
- npm or yarn
- MongoDB (local or Atlas)
- Ngrok (for local development)

---

## Twilio Setup

### Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up with email
3. Verify your phone number
4. Complete the onboarding questions

### Step 2: Get a Phone Number

1. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
2. Search for a number in your country
3. **Required capabilities:**
   - ✅ SMS
   - ✅ Voice
4. Click **Buy** (~$1/month)

### Step 3: Get Your Credentials

1. Go to **Account** → **API keys & tokens**
2. Copy these values:
   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: [click to reveal]
   ```

### Step 4: Configure Webhooks (Do this AFTER server is running)

We'll set these up later once your server is running:
- SMS Webhook
- Voice Webhook

---

## OpenAI Setup

### Step 1: Create Account

1. Go to https://platform.openai.com/signup
2. Sign up with email or Google
3. Verify email address

### Step 2: Add Payment Method

1. Navigate to **Settings** → **Billing**
2. Click **Add payment method**
3. Add credit card
4. Set usage limits (recommended: $10/month to start)

### Step 3: Create API Key

1. Go to **API keys**
2. Click **Create new secret key**
3. Name it: "Personal Assistant"
4. Copy the key (starts with `sk-`)
5. **Important:** Save it now - you can't see it again!

---

## MongoDB Setup

### Option A: Local MongoDB (Development)

1. **Install MongoDB:**
   ```bash
   # macOS
   brew install mongodb-community

   # Ubuntu
   sudo apt-get install mongodb

   # Windows
   # Download from: https://www.mongodb.com/try/download/community
   ```

2. **Start MongoDB:**
   ```bash
   # macOS/Linux
   mongod --dbpath ~/data/db

   # Windows
   # MongoDB runs as a service automatically
   ```

3. **Connection String:**
   ```
   MONGODB_URI=mongodb://localhost:27017/personal-assistant
   ```

### Option B: MongoDB Atlas (Production)

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up (free tier available)

2. **Create Cluster:**
   - Click **Build a Database**
   - Choose **Free** tier (M0)
   - Select region closest to you
   - Click **Create**

3. **Set Up Access:**
   - **Database Access:**
     - Create username and password
     - Save these credentials
   - **Network Access:**
     - Add IP: `0.0.0.0/0` (allow all - for development)
     - For production: Add your server's IP

4. **Get Connection String:**
   - Click **Connect** → **Connect your application**
   - Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/personal-assistant
   ```
   - Replace `username` and `password`

---

## Local Development

### Step 1: Install Dependencies

```bash
cd /path/to/choretrackernew
npm install
```

### Step 2: Create Environment File

```bash
cp server/assistant/.env.example .env
```

### Step 3: Configure Environment Variables

Edit `.env`:

```bash
# Server
ASSISTANT_PORT=5001
NODE_ENV=development

# MongoDB (choose one)
MONGODB_URI=mongodb://localhost:27017/personal-assistant
# OR
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/personal-assistant

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Domain (will update after ngrok)
DOMAIN=http://localhost:5001
```

### Step 4: Start Ngrok

```bash
# Install ngrok
brew install ngrok
# OR download from: https://ngrok.com/download

# Start ngrok
ngrok http 5001
```

You'll see output like:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5001
```

### Step 5: Update DOMAIN in .env

```bash
DOMAIN=https://abc123.ngrok.io
```

### Step 6: Configure Twilio Webhooks

1. Go to Twilio Console: https://console.twilio.com/
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number

**Configure SMS:**
- Scroll to **Messaging**
- **A message comes in:**
  - Webhook: `https://abc123.ngrok.io/assistant/webhooks/sms/incoming`
  - HTTP POST
- **Save**

**Configure Voice:**
- Scroll to **Voice & Fax**
- **A call comes in:**
  - Webhook: `https://abc123.ngrok.io/assistant/webhooks/voice/incoming`
  - HTTP POST
- **Save**

### Step 7: Start the Server

```bash
node server/assistant-server.js
```

You should see:
```
═══════════════════════════════════════════════════════
  🤖 Personal Assistant Server
═══════════════════════════════════════════════════════
  Port: 5001
  ...
  Status: Ready to transform lives 🚀
═══════════════════════════════════════════════════════
```

### Step 8: Test It!

**Send an SMS to your Twilio number:**
```
Hi!
```

You should receive:
```
Hey there! I'm your personal life assistant...
What should I call you?
```

Reply with your name:
```
Marco
```

Response:
```
Great to meet you, Marco! 🎉

Here's what I can do:
• Track habits & goals
• Manage tasks
...
```

**It's working!** 🎉

---

## Production Deployment

### Railway Deployment

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize Project:**
   ```bash
   railway init
   ```

4. **Set Environment Variables:**
   ```bash
   railway variables set MONGODB_URI="your_atlas_uri"
   railway variables set TWILIO_ACCOUNT_SID="your_sid"
   railway variables set TWILIO_AUTH_TOKEN="your_token"
   railway variables set TWILIO_PHONE_NUMBER="your_number"
   railway variables set OPENAI_API_KEY="your_key"
   railway variables set ASSISTANT_PORT="5001"
   railway variables set NODE_ENV="production"
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

6. **Get Your Domain:**
   ```bash
   railway domain
   ```

7. **Update Twilio Webhooks:**
   - Use your Railway domain instead of ngrok
   - SMS: `https://your-app.railway.app/assistant/webhooks/sms/incoming`
   - Voice: `https://your-app.railway.app/assistant/webhooks/voice/incoming`

8. **Update DOMAIN variable:**
   ```bash
   railway variables set DOMAIN="https://your-app.railway.app"
   ```

---

## Testing

### Test Scenarios

**1. Basic Interaction:**
```
User: "Hi"
Expected: Welcome message + name request

User: "John"
Expected: Onboarding completion
```

**2. Task Creation:**
```
User: "Remind me to call mom"
Expected: Task created confirmation
```

**3. Habit Logging:**
```
User: "gym done"
Expected: Habit logged + streak info
```

**4. Goal Setting:**
```
User: "goal: read 12 books this year"
Expected: Goal created confirmation
```

**5. Voice Call:**
```
Action: Call your Twilio number
Expected: AI answers and can converse
```

**6. Morning Check-In:**
```
Action: Wait for 7 AM or manually trigger
Expected: Morning briefing SMS
```

### Debugging

**Check Server Logs:**
```bash
# View all logs
tail -f logs/assistant.log

# Watch live
railway logs
```

**Check Twilio Debugger:**
- https://console.twilio.com/monitor/debugger
- Shows all webhook calls and errors

**Test Webhooks:**
```bash
# Send test SMS via curl
curl -X POST https://your-domain/assistant/webhooks/sms/incoming \
  -d "From=+1234567890" \
  -d "Body=test message"
```

---

## Next Steps

1. **Customize AI Personality:**
   - Edit `server/assistant/services/aiService.js`
   - Modify system prompts

2. **Adjust Check-In Times:**
   - Default: 7 AM morning, 9 PM evening
   - Users can customize via SMS

3. **Add More Functions:**
   - Add new tools to AI service
   - Create custom handlers

4. **Set Up Monitoring:**
   - Error tracking (Sentry)
   - Analytics (Mixpanel)
   - Logs (LogDNA)

5. **Scale:**
   - Upgrade MongoDB tier
   - Increase OpenAI rate limits
   - Add Redis for caching

---

## Costs Breakdown

### Monthly Costs (Per Active User)

| Service | Cost | Details |
|---------|------|---------|
| Twilio SMS | $3.30 | 15 msgs/day @ $0.0079/msg |
| Twilio Voice | $1.80 | 5 mins/day @ $0.014/min |
| OpenAI API | $2.00 | GPT-4o-mini (~500k tokens) |
| **Total** | **~$7/user** | |

### Fixed Costs

| Service | Cost | Details |
|---------|------|---------|
| Twilio Phone | $1/month | Per phone number |
| MongoDB Atlas | Free - $57 | M0 (free) to M10 |
| Hosting (Railway) | $5/month | Starter plan |
| **Total Fixed** | **$6-63/month** | |

**Example:**
- 10 users: ~$76/month ($7.60/user)
- 100 users: ~$706/month ($7.06/user)
- 1000 users: ~$7,006/month ($7.01/user)

---

## Support & Resources

**Documentation:**
- Twilio Docs: https://www.twilio.com/docs
- OpenAI Docs: https://platform.openai.com/docs
- MongoDB Docs: https://docs.mongodb.com

**Community:**
- Twilio Discord
- OpenAI Forum
- MongoDB Community

**Need Help?**
- Check server logs first
- Review Twilio debugger
- Test with ngrok locally
- Create GitHub issue

---

## Security Best Practices

1. **Never commit .env file**
   - Add to .gitignore
   - Use environment variables in production

2. **Validate Twilio Webhooks**
   - Verify signatures (implemented in code)
   - Whitelist Twilio IPs

3. **Rate Limiting**
   - Implement per-user rate limits
   - Prevent abuse

4. **Data Privacy**
   - Encrypt sensitive data
   - GDPR compliance (if EU users)
   - Allow data export/deletion

5. **API Keys**
   - Rotate regularly
   - Use separate keys for dev/prod
   - Monitor usage

---

**You're all set! Time to transform some lives! 🚀**
