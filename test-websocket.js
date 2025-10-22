/**
 * WebSocket Connection Test for Railway
 * Tests if the voice stream WebSocket endpoint is accessible
 */

const WebSocket = require('ws');

const WS_URL = 'wss://choretrackernew-production.up.railway.app/assistant/voice/stream';

console.log('Testing WebSocket connection to:', WS_URL);
console.log('This simulates what Twilio does when connecting...\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket CONNECTED successfully!');
  console.log('   This means Railway can handle WebSocket connections.\n');

  // Send a test "start" message like Twilio would
  const twilioStartMessage = {
    event: 'start',
    streamSid: 'TEST_STREAM_SID',
    start: {
      callSid: 'TEST_CALL_SID',
      customParameters: {
        userId: 'test-user-id'
      }
    }
  };

  console.log('Sending test start message:', JSON.stringify(twilioStartMessage, null, 2));
  ws.send(JSON.stringify(twilioStartMessage));

  // Close after 3 seconds
  setTimeout(() => {
    console.log('\n✅ Test complete. WebSocket is working!');
    ws.close();
    process.exit(0);
  }, 3000);
});

ws.on('message', (data) => {
  console.log('📨 Received message from server:', data.toString().substring(0, 200));
});

ws.on('error', (error) => {
  console.error('❌ WebSocket ERROR:', error.message);
  console.error('   This means Railway cannot handle WebSocket connections or the endpoint is not accessible.');
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket closed. Code: ${code}, Reason: ${reason || 'none'}`);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Connection timeout - WebSocket did not connect within 10 seconds');
  ws.close();
  process.exit(1);
}, 10000);
