const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      console.error('Missing Twilio credentials in environment variables');
      return;
    }

    this.client = twilio(this.accountSid, this.authToken);
    console.log('Twilio service initialized');
  }

  /**
   * Send an SMS message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message content
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendSMS(to, message) {
    try {
      console.log(`Sending SMS to ${to}: ${message.substring(0, 50)}...`);

      const messageObj = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: to
      });

      console.log(`SMS sent successfully. SID: ${messageObj.sid}`);
      return messageObj;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Make an outbound voice call
   * @param {string} to - Recipient phone number
   * @param {string} webhookUrl - URL for call instructions
   * @returns {Promise<Object>} - Twilio call object
   */
  async makeCall(to, webhookUrl) {
    try {
      console.log(`Initiating call to ${to}`);

      const call = await this.client.calls.create({
        url: webhookUrl,
        to: to,
        from: this.phoneNumber
      });

      console.log(`Call initiated. SID: ${call.sid}`);
      return call;
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  /**
   * Generate TwiML for inbound voice calls
   * @param {string} websocketUrl - WebSocket URL for audio streaming
   * @param {string} greeting - Optional greeting message
   * @returns {string} - TwiML XML
   */
  generateVoiceTwiML(websocketUrl, greeting = null) {
    const response = new VoiceResponse();

    if (greeting) {
      response.say(greeting);
    }

    const connect = response.connect();
    connect.stream({
      url: websocketUrl,
      name: 'audio-stream'
    });

    return response.toString();
  }

  /**
   * Generate TwiML for outbound call with AI assistant
   * @param {string} websocketUrl - WebSocket URL for OpenAI Realtime API
   * @param {string} greeting - Greeting message
   * @returns {string} - TwiML XML
   */
  generateAIVoiceTwiML(websocketUrl, greeting = "Hey! I'm here. What's on your mind?") {
    const response = new VoiceResponse();

    response.say({
      voice: 'Polly.Joanna'
    }, greeting);

    const connect = response.connect();
    connect.stream({
      url: websocketUrl,
      name: 'openai-realtime-stream'
    });

    return response.toString();
  }

  /**
   * Validate incoming webhook request
   * @param {string} url - The full URL of the webhook
   * @param {Object} params - The request parameters
   * @param {string} signature - The X-Twilio-Signature header
   * @returns {boolean} - True if valid
   */
  validateWebhook(url, params, signature) {
    return twilio.validateRequest(
      this.authToken,
      signature,
      url,
      params
    );
  }

  /**
   * Send a typing indicator (workaround for SMS)
   * This sends a brief message to indicate the assistant is processing
   */
  async sendTypingIndicator(to) {
    // SMS doesn't support typing indicators, but we can send a quick acknowledgment
    return this.sendSMS(to, '...');
  }

  /**
   * Check message delivery status
   * @param {string} messageSid - Message SID to check
   * @returns {Promise<Object>} - Message status
   */
  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Error fetching message status:', error);
      throw error;
    }
  }
}

module.exports = new TwilioService();
