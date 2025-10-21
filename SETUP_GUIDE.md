# Setup Guide - Chore Tracker + Personal Assistant

## Quick Start Checklist

- [ ] Install dependencies
- [ ] Set up MongoDB
- [ ] Get Twilio credentials
- [ ] Get OpenAI API key
- [ ] Configure environment variables
- [ ] Set up ngrok (for development)
- [ ] Configure Twilio webhooks
- [ ] Start the servers

---

## 1. Install Dependencies

```bash
# Install root dependencies
npm install

# This will also install client and server dependencies
```

---

## 2. Database Setup

### Option A: Local MongoDB (Recommended for Development)

1. **Install MongoDB:**
   - **Ubuntu/Debian:** `sudo apt-get install mongodb`
   - **macOS:** `brew install mongodb-community`
   - **Windows:** Download from [mongodb.com/download-center/community](https://www.mongodb.com/try/download/community)

2. **Start MongoDB:**
   ```bash
   # macOS/Linux
   sudo systemctl start mongod

   # or
   mongod --dbpath=/path/to/data
   ```

3. **Verify MongoDB is running:**
   ```bash
   mongosh
   # Should connect to MongoDB shell
   ```

### Option B: MongoDB Atlas (Cloud - Free Tier Available)

1. **Create account:** [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. **Create cluster:** Choose free tier (M0)
3. **Create database user:** Set username and password
4. **Whitelist IP:** Add `0.0.0.0/0` for development (all IPs)
5. **Get connection string:** Click "Connect" → "Connect your application"
6. **Copy connection string:** Looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dbname
   ```

---

## 3. Get Twilio Credentials

1. **Create account:** [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
   - Free trial includes $15 credit
   - Can send/receive SMS and calls

2. **Get credentials:**
   - Go to [console.twilio.com](https://console.twilio.com/)
   - **Account SID:** Found on dashboard (starts with `AC`)
   - **Auth Token:** Click "View" to reveal

3. **Get phone number:**
   - Navigate to Phone Numbers → Buy a Number
   - Choose a number with SMS + Voice capabilities
   - Format: `+12345678900`

**Costs:**
- Phone number: ~$1/month
- SMS: $0.0075 per message
- Voice: $0.0085 per minute

---

## 4. Get OpenAI API Key

1. **Create account:** [platform.openai.com/signup](https://platform.openai.com/signup)

2. **Add payment method:**
   - Go to Settings → Billing
   - Add credit card
   - Recommended: Set usage limit ($10-20/month)

3. **Create API key:**
   - Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Copy key (starts with `sk-proj-`)
   - **⚠️ Save immediately - you can't view it again**

**Costs:**
- GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- Realtime API: $5 per 1M input tokens, $20 per 1M output tokens
- Estimated: ~$2-5/month for personal use

---

## 5. Configure Environment Variables

1. **Edit `.env` file in project root:**
   ```bash
   nano .env
   # or use your favorite editor
   ```

2. **Fill in your credentials:**

   ```bash
   # Required for Assistant
   MONGODB_URI=mongodb://localhost:27017/chore-tracker
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

   # Required for Authentication
   JWT_SECRET=generate_random_string_here

   # Will update after ngrok starts
   DOMAIN=https://your-ngrok-url.ngrok.io
   ```

3. **Generate JWT Secret:**
   ```bash
   # Linux/macOS
   openssl rand -base64 32

   # Or use any random string (32+ characters)
   ```

---

## 6. Set Up Ngrok (Development)

Ngrok creates a public URL for your localhost, needed for Twilio webhooks.

1. **Install ngrok:**
   - Download from [ngrok.com/download](https://ngrok.com/download)
   - Or via package manager:
     ```bash
     # macOS
     brew install ngrok

     # Ubuntu/Debian
     sudo snap install ngrok
     ```

2. **Sign up and authenticate:**
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
   Get authtoken from [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)

3. **Start ngrok:**
   ```bash
   ngrok http 5001
   ```

4. **Copy the forwarding URL:**
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:5001
              ^^^^^^^^^^^^^^^^^^^^^^^^
              Copy this URL
   ```

5. **Update `.env` file:**
   ```bash
   DOMAIN=https://abc123.ngrok.io
   ```

**⚠️ Important:** Ngrok URL changes every time you restart (free tier). Update `.env` and Twilio webhooks when this happens.

---

## 7. Configure Twilio Webhooks

1. **Go to Twilio Console:**
   - Navigate to Phone Numbers → Manage → Active Numbers
   - Click on your phone number

2. **Configure SMS Webhook:**
   - Under "Messaging"
   - A MESSAGE COMES IN:
     - **Webhook:** `https://your-ngrok-url.ngrok.io/assistant/webhooks/sms`
     - **Method:** HTTP POST
   - Click Save

3. **Configure Voice Webhook:**
   - Under "Voice & Fax"
   - A CALL COMES IN:
     - **Webhook:** `https://your-ngrok-url.ngrok.io/assistant/webhooks/voice`
     - **Method:** HTTP POST
   - CALL STATUS CHANGES:
     - **Webhook:** `https://your-ngrok-url.ngrok.io/assistant/webhooks/voice-status`
     - **Method:** HTTP POST
   - Click Save

**⚠️ Remember:** Update these webhooks whenever your ngrok URL changes!

---

## 8. Start the Servers

### Option A: Run Everything (Recommended)
```bash
npm run assistant:all
```
This starts:
- Chore Tracker backend (port 5000)
- Chore Tracker frontend (port 3000)
- Personal Assistant (port 5001)

### Option B: Run Personal Assistant Only
```bash
npm run assistant:dev
```

### Option C: Run Chore Tracker Only
```bash
npm run dev
```

---

## 9. Test Your Setup

### Test SMS:
1. Send a text to your Twilio number: `"Hi"`
2. Should receive response from AI assistant

### Test Voice:
1. Call your Twilio number
2. Should connect to AI assistant
3. Try saying: "This is a test call"

### Check Logs:
- Watch terminal for activity
- Twilio Debugger: [console.twilio.com/monitor/debugger](https://console.twilio.com/monitor/debugger)

---

## Troubleshooting

### "MongoDB connection failed"
- Verify MongoDB is running: `mongosh`
- Check connection string in `.env`
- For Atlas: check IP whitelist

### "Twilio webhook error"
- Verify ngrok is running and URL is correct
- Check webhook configuration in Twilio console
- Check Twilio debugger for detailed errors

### "OpenAI API error"
- Verify API key is correct
- Check billing: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- Ensure you have credits/payment method

### "No response from assistant"
- Check server logs for errors
- Verify `.env` variables are loaded
- Test health endpoint: `http://localhost:5001/health`

### Ngrok URL keeps changing
- Upgrade to ngrok paid tier for permanent URL ($8/month)
- Or use alternative: localtunnel, serveo

---

## Optional: Additional Services

### Deepgram (Voice Transcription)
1. Sign up: [console.deepgram.com/signup](https://console.deepgram.com/signup)
2. Get API key: [console.deepgram.com/](https://console.deepgram.com/)
3. Add to `.env`: `DEEPGRAM_API_KEY=your_key`

### Groq (Fast AI Inference)
1. Sign up: [console.groq.com/](https://console.groq.com/)
2. Get API key
3. Add to `.env`: `GROQ_API_KEY=your_key`

---

## Production Deployment

For production deployment, see:
- `PERSONAL_ASSISTANT_SETUP.md` - Detailed production guide
- Use Railway, Heroku, or DigitalOcean
- Use permanent domain instead of ngrok
- Enable SSL/HTTPS
- Set `NODE_ENV=production`

---

## Cost Summary

**Monthly Costs (Personal Use):**
- Twilio Phone Number: $1
- Twilio SMS (~300 msgs): $2.25
- Twilio Voice (~30 mins): $0.26
- OpenAI API: $2-5
- MongoDB Atlas (free tier): $0
- **Total: ~$5-10/month**

**With ngrok paid (optional):** +$8/month

---

## Getting Help

- **Documentation:** `PERSONAL_ASSISTANT_SUMMARY.md`
- **Twilio Docs:** [twilio.com/docs](https://www.twilio.com/docs)
- **OpenAI Docs:** [platform.openai.com/docs](https://platform.openai.com/docs)
- **MongoDB Docs:** [docs.mongodb.com](https://docs.mongodb.com/)

---

## Next Steps After Setup

1. Text your assistant and interact
2. Customize AI prompts in `server/assistant/services/aiService.js`
3. Adjust check-in times in `.env`
4. Explore habit tracking, goals, and tasks
5. Try voice calls with Realtime API
6. Review analytics and patterns

---

**Ready to transform your life? Let's go! 🚀**
