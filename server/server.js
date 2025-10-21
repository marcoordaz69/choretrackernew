// Import necessary modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const Groq = require("groq-sdk");
const wav = require('wav');
const OpenAI = require('openai');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Your route files
const authRoutes = require('./routes/authRoutes');
const familyRoutes = require('./routes/familyRoutes');
const choresRoutes = require('./routes/chores');
const chatRoutes = require('./routes/chat'); // New chat routes
const familyProgressRoutes = require('./routes/familyProgress');

// Global variables for interrupt handling
let isAISpeaking = false;
let interruptBuffer = Buffer.alloc(0);
const INTERRUPT_THRESHOLD = 500; // Adjust as needed
let dgConnection;

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Add static file serving for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/chores', choresRoutes);
app.use('/api/chat', chatRoutes); // Add this line if it's not already there
app.use('/api', familyProgressRoutes);

// Add welcome route
app.get('/', (req, res) => {
  res.send('Welcome to My Chore Tracker!');
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Serve React app for any unmatched routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

console.log('Attempting to connect to MongoDB...');
console.log('MONGODB_URI:', MONGODB_URI.replace(/\/\/.*@/, '//<CREDENTIALS>@')); // Mask credentials
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    console.log('Available collections:', Object.keys(mongoose.connection.collections));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Deepgram
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
console.log('Deepgram API Key:', process.env.DEEPGRAM_API_KEY ? `${process.env.DEEPGRAM_API_KEY.slice(0, 5)}...` : 'Not set');

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add the system instructions
const systemInstructions = `
You are a helpful AI assistant focused on providing concise, accurate responses.
Follow these guidelines:
1. Be direct and to the point. Avoid unnecessary elaboration.
2. Prioritize brevity without sacrificing essential information.
3. Use short sentences and simple language.
4. Provide step-by-step instructions when needed, keeping each step brief.
5. If a longer explanation is necessary, offer a concise summary first, then ask if more details are desired.
6. Avoid filler phrases, pleasantries, or unnecessary context.
7. When answering questions, start with the most relevant information.
8. If unsure about a specific detail, state that clearly rather than speculating.
9. Use bullet points or numbered lists for multiple items or steps.
10. Conclude your response once you've addressed the core of the query.
`;

// Modify the existing Groq API call function
async function getGroqResponse(userQuery) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: userQuery }
      ],
      model: "gpt-3.5-turbo", // or whichever model you prefer
      max_tokens: 500,
      temperature: 0.5,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

async function deepgramTextToSpeech(text) {
  console.log('Converting to speech:', text);
  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-arcas-en",
        encoding: "linear16",
        sample_rate: 16000,
      }
    );

    const stream = await response.getStream();
    const audioBuffer = await getAudioBuffer(stream);
    console.log('TTS Audio generated, length:', audioBuffer.length);
    return audioBuffer;
  } catch (error) {
    console.error('Error in Deepgram text-to-speech conversion:', error);
    return null;
  }
}

// Helper function to convert stream to audio buffer
async function getAudioBuffer(response) {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

function generateVonageJWT() {
  try {
    const pemPath = path.join(__dirname, 'private.key');
    console.log('Reading private key from:', pemPath);
    const privateKey = fs.readFileSync(pemPath, 'utf8');

    const claims = {
      application_id: process.env.VONAGE_APPLICATION_ID,
      iat: Math.floor(Date.now() / 1000),
      jti: Math.random().toString(36).substring(2),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 // expires in 1 hour
    };

    console.log('Attempting to generate Vonage JWT...');
    const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
    console.log('Vonage JWT generated successfully');
    return token;
  } catch (error) {
    console.error('Error generating Vonage JWT:', error);
    return null;
  }
}

// Generate JWT on server start
let vonageJWT = generateVonageJWT();
if (vonageJWT) {
  process.env.VONAGE_JWT = vonageJWT;
  console.log('Vonage JWT set in environment variables');
} else {
  console.error('Failed to set Vonage JWT in environment variables');
}

// Regenerate JWT every 55 minutes
setInterval(() => {
  vonageJWT = generateVonageJWT();
  if (vonageJWT) {
    process.env.VONAGE_JWT = vonageJWT;
    console.log('Vonage JWT refreshed');
  } else {
    console.error('Failed to refresh Vonage JWT');
  }
}, 55 * 60 * 1000);

// Your route files
// const authRoutes = require('./routes/authRoutes');
// const familyRoutes = require('./routes/familyRoutes');
// const choresRoutes = require('./routes/chores');
// const chatRoutes = require('./routes/chat'); // Make sure this path is correct

// Vonage webhook routes
app.all('/vonage/voice/answer', (req, res) => {
  console.log('Received voice answer webhook:', req.method, req.query);
  // Use RAILWAY_PUBLIC_DOMAIN or NGROK_URL for backward compatibility
  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.NGROK_URL || req.get('host');
  const websocketUrl = `wss://${baseUrl}/ws`;
  console.log('WebSocket URL for Vonage:', websocketUrl);

  res.json([
    {
      action: 'connect',
      endpoint: [
        {
          type: 'websocket',
          uri: websocketUrl,
          'content-type': 'audio/l16;rate=16000',
          headers: {},
          direction: "both"
        }
      ]
    }
  ]);
});

app.all('/vonage/voice/event', (req, res) => {
  console.log('Received voice event webhook:', req.method, req.body || req.query);
  res.sendStatus(200);
});

// Set up HTTP server
const server = http.createServer(app);

// Set up WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

function convertEndianness(buffer) {
  const converted = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i += 2) {
    converted[i] = buffer[i + 1];
    converted[i + 1] = buffer[i];
  }
  return converted;
}

// Add these constants
const SPEECH_THRESHOLD = 1000; // Adjust based on your audio characteristics
const TRANSCRIPT_TIMEOUT = 10000; // 10 seconds

wss.on('connection', async (ws) => {
  console.log('WebSocket connection established');
  let callStartTime = Date.now();
  let audioPacketsReceived = 0;
  let transcriptionsReceived = 0;
  let totalAudioDataLength = 0;
  let audioBuffer = Buffer.alloc(0);
  let lastTranscriptTime = Date.now();

  // Create a WAV file writer (expecting little-endian data)
  const outputFilePath = path.join(__dirname, `call_${Date.now()}.wav`);
  const fileWriter = new wav.FileWriter(outputFilePath, {
    channels: 1,
    sampleRate: 16000,
    bitDepth: 16
  });

  // Create a websocket connection to Deepgram
  try {
    dgConnection = await deepgram.listen.live({
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
      interim_results: true,
      endpointing: 200,
      vad_events: true,
      punctuate: true,
      language: "en-US",
      model: "general",
    });

    console.log('Deepgram connection opened');

    dgConnection.addListener(LiveTranscriptionEvents.Open, () => {
      console.log('Deepgram connection opened successfully');
    });

    dgConnection.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
      console.log('Transcript received:', JSON.stringify(data, null, 2));
      transcriptionsReceived++;

      if (data.is_final) {
        const transcript = data.channel.alternatives[0].transcript;
        console.log('Final transcript:', transcript);

        if (transcript.trim()) {
          lastTranscriptTime = Date.now();
          try {
            const groqResponse = await getGroqResponse(transcript);
            console.log('Groq response:', groqResponse);
            
            isAISpeaking = true;
            const speechAudio = await deepgramTextToSpeech(groqResponse);
            if (speechAudio) {
              console.log('Sending audio response back to Vonage');
              await sendAudioResponse(speechAudio, ws);
              console.log('Finished sending audio response');
            } else {
              console.error('Failed to generate speech audio');
            }
            isAISpeaking = false;
          } catch (error) {
            console.error('Error processing transcript:', error);
          }
        } else {
          console.log('Received empty final transcript, skipping processing');
        }
      }
    });

    dgConnection.addListener(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed');
    });

    dgConnection.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.error('Deepgram error:', error);
    });

  } catch (error) {
    console.error('Error creating Deepgram connection:', error);
  }

  function logAudioLevels(audioChunk) {
    const int16Array = new Int16Array(audioChunk.buffer, audioChunk.byteOffset, audioChunk.length / 2);
    const energy = int16Array.reduce((sum, val) => sum + Math.abs(val), 0) / int16Array.length;
    console.log(`Audio energy level: ${energy}`);
  }

  function detectLocalSpeech(audioChunk) {
    const int16Array = new Int16Array(audioChunk.buffer, audioChunk.byteOffset, audioChunk.length / 2);
    const energy = int16Array.reduce((sum, val) => sum + Math.abs(val), 0) / int16Array.length;
    return energy > SPEECH_THRESHOLD;
  }

  function handleInterruption() {
    console.log("Handling interruption");
    isAISpeaking = false;
    // Process the interrupt buffer
    if (dgConnection) {
      try {
        dgConnection.send(interruptBuffer);
      } catch (error) {
        console.error('Error sending interrupt audio to Deepgram:', error);
      }
    }
    interruptBuffer = Buffer.alloc(0);
  }

  function detectSpeech(audioChunk) {
    const int16Array = new Int16Array(audioChunk.buffer, audioChunk.byteOffset, audioChunk.length / 2);
    const energy = int16Array.reduce((sum, val) => sum + Math.abs(val), 0) / int16Array.length;
    return energy > INTERRUPT_THRESHOLD;
  }

  async function sendAudioResponse(speechAudio, ws) {
    const chunkSize = 640;
    for (let i = 0; i < speechAudio.length; i += chunkSize) {
      if (!isAISpeaking) break; // Stop if interrupted
      const chunk = speechAudio.slice(i, i + chunkSize);
      await new Promise((resolve, reject) => {
        ws.send(chunk, (error) => {
          if (error) {
            console.error('Error sending audio chunk back to Vonage:', error);
            reject(error);
          } else {
            resolve();
          }
        });
      });
      await new Promise(resolve => setTimeout(resolve, 20)); // Small delay to check for interruptions
    }
  }

  ws.on('message', (message) => {
    console.log('Received message from Vonage, type:', typeof message, 'isBuffer:', Buffer.isBuffer(message), 'length:', message.length);
    
    if (!Buffer.isBuffer(message)) {
      console.error('Received data is not a Buffer');
      return;
    }

    audioPacketsReceived++;
    totalAudioDataLength += message.length;

    // Append the new data to our audio buffer
    audioBuffer = Buffer.concat([audioBuffer, message]);

    // Process audio in chunks of 640 bytes (320 samples)
    while (audioBuffer.length >= 640) {
      const chunk = audioBuffer.slice(0, 640);
      audioBuffer = audioBuffer.slice(640);

      const convertedChunk = convertEndianness(chunk);

      logAudioLevels(convertedChunk);

      if (detectLocalSpeech(convertedChunk)) {
        console.log('Local speech detected');
      }

      if (isAISpeaking) {
        interruptBuffer = Buffer.concat([interruptBuffer, convertedChunk]);
        if (detectSpeech(convertedChunk)) {
          handleInterruption();
        }
      } else {
        // Send audio to Deepgram when AI is not speaking
        if (dgConnection) {
          try {
            console.log(`Sending ${convertedChunk.length} bytes to Deepgram`);
            dgConnection.send(convertedChunk);
          } catch (error) {
            console.error('Error sending audio to Deepgram:', error);
          }
        } else {
          console.error('Deepgram connection not established');
        }
      }

      // Save converted (little-endian) audio to file
      try {
        fileWriter.write(convertedChunk);
      } catch (error) {
        console.error('Error writing to WAV file:', error);
      }
    }

    // Check for transcript timeout
    if (Date.now() - lastTranscriptTime > TRANSCRIPT_TIMEOUT) {
      console.log('No transcript received for a while, triggering fallback response');
      // Implement fallback response logic here
      // For example:
      // handleFallbackResponse();
    }
  });

  ws.on('close', () => {
    const callDuration = (Date.now() - callStartTime) / 1000; // in seconds
    console.log(`WebSocket connection closed. Call duration: ${callDuration.toFixed(2)} seconds`);
    console.log(`Total audio packets received: ${audioPacketsReceived}`);
    console.log(`Total transcriptions received: ${transcriptionsReceived}`);
    console.log(`Audio saved to: ${outputFilePath}`);
    console.log(`Total audio data length: ${totalAudioDataLength} bytes`);
    if (dgConnection) {
      dgConnection.finish();
    }
    fileWriter.end();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Make sure ngrok is pointing to http://localhost:${PORT}`);
});

console.log('Environment variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('DEEPGRAM_API_KEY:', process.env.DEEPGRAM_API_KEY ? 'Set' : 'Not set');
console.log('NGROK_URL:', process.env.NGROK_URL ? 'Set' : 'Not set');
console.log('VONAGE_APPLICATION_ID:', process.env.VONAGE_APPLICATION_ID ? 'Set' : 'Not set');
console.log('VONAGE_PRIVATE_KEY:', process.env.VONAGE_PRIVATE_KEY ? 'Set' : 'Not set');
console.log('VONAGE_JWT:', process.env.VONAGE_JWT ? 'Set' : 'Not set');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Set' : 'Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Optionally, you might want to exit the process here
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally, you might want to exit the process here
  // process.exit(1);
});