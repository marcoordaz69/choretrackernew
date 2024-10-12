import React, { useState, useEffect, useRef } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder } from '../lib/wavtools';
import axios from 'axios';
import { instructions } from '../utils/conversation_config.js';
import { FaMicrophone } from 'react-icons/fa';

const SAMPLE_RATE = 24000;

const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'interactive'
  });
};

const registerAudioWorkletProcessor = async (audioContext) => {
  try {
    await audioContext.audioWorklet.addModule('path-to-your-processor.js');
  } catch (error) {
    console.error('Error registering AudioWorklet processor:', error);
  }
};

const LOCAL_RELAY_SERVER_URL = process.env.REACT_APP_LOCAL_RELAY_SERVER_URL;
const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const RealtimeComponent = ({ theme, avatarId }) => {
  const [messages, setMessages] = useState([]);
  const [turnEndType, setTurnEndType] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const clientRef = useRef(null);
  const wavRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueue = useRef([]);
  const isProcessingQueueRef = useRef(false);
  const lastEndTimeRef = useRef(0);
  const currentSourceRef = useRef(null);
  const isInterruptedRef = useRef(false);

  useEffect(() => {
    const setupClient = async () => {
      try {
        console.log('Setting up audio context and client');
        audioContextRef.current = createAudioContext();
        await registerAudioWorkletProcessor(audioContextRef.current);

        clientRef.current = new RealtimeClient(
          LOCAL_RELAY_SERVER_URL
            ? { url: LOCAL_RELAY_SERVER_URL }
            : {
                apiKey: API_KEY,
                dangerouslyAllowAPIKeyInBrowser: true,
              }
        );

        await clientRef.current.updateSession({
          instructions: instructions,
        });

        console.log('Behavior instructions applied successfully');

        clientRef.current.addTool(
          {
            name: 'get_chores',
            description: "Get the user's chores for a specific date, or for today if no date is specified",
            parameters: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'The date to get chores for in ISO 8601 format (YYYY-MM-DD)',
                },
              },
              required: [],
            },
          },
          async ({ date }) => {
            try {
              // Fallback to today if date is not provided
              const formattedDate = date || new Date().toISOString().split('T')[0];
              console.log(`Fetching chores for date: ${formattedDate}`);

              const response = await axios.post('/api/chat', { 
                message: `What are the chores for ${formattedDate}?`,
                avatarId: avatarId,
              });

              if (response.status === 200 && response.data.message) {
                console.log('Chores successfully retrieved:', response.data.message);
                return response.data.message;
              } else {
                throw new Error('Unexpected API response format or status');
              }
            } catch (error) {
              console.error('Error getting chores:', error);
              return `Sorry, I couldn't retrieve the chores for ${date || "today"} due to: ${error.message}`;
            }
          }
        );

        console.log('Chore management tool added successfully');

        wavRecorderRef.current = new WavRecorder({ sampleRate: SAMPLE_RATE });

        clientRef.current.on('conversation.updated', handleConversationUpdate);

        clientRef.current.on('input_audio_buffer.speech_started', () => {
          console.log('Speech Start detected, calling handleInterruptAI');
          handleInterruptAI();
        });

        await clientRef.current.connect();
        console.log('Connected to the Realtime API successfully');
      } catch (error) {
        console.error('Error setting up the Realtime Client or applying instructions:', error);
      }
    };

    setupClient();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [avatarId]);

  const handleConversationUpdate = async ({ item, delta }) => {
    console.log('Conversation updated event received');
    console.log('Full item:', item);
    console.log('Delta:', delta);

    if (delta?.content) {
      console.log("Text response received:", delta.content);
      setMessages(prev => [...prev, { id: prev.length + 1, text: delta.content, isAi: true }]);
    }

    if (delta?.audio && !isInterruptedRef.current) {
      console.log("Audio response received, length:", delta.audio.length);
      await queueAudioBuffer(delta.audio);
    }

    if (delta?.function_call) {
      console.log("Function call received:", delta.function_call);
      // Log function call details
      console.log("Function name:", delta.function_call.name);
      console.log("Function arguments:", delta.function_call.arguments);
    }
  };

  const queueAudioBuffer = async (audioBuffer) => {
    console.log('Queuing audio buffer, length:', audioBuffer.length);
    const audioContext = audioContextRef.current;
    const buffer = audioContext.createBuffer(1, audioBuffer.length, SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < audioBuffer.length; i++) {
      channelData[i] = audioBuffer[i] / 32768;
    }

    audioQueue.current.push(buffer);
    console.log('Audio buffer queued for playback');

    if (!isProcessingQueueRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = () => {
    console.log('Processing audio queue');
    if (audioQueue.current.length === 0 || isInterruptedRef.current) {
      isProcessingQueueRef.current = false;
      setIsPlaying(false);
      console.log('Audio queue processing finished or interrupted');
      return;
    }

    isProcessingQueueRef.current = true;
    setIsPlaying(true);

    const audioContext = audioContextRef.current;
    const buffer = audioQueue.current.shift();

    console.log('Playing audio buffer, duration:', buffer.duration);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    currentSourceRef.current = source;

    const startTime = Math.max(audioContext.currentTime, lastEndTimeRef.current);
    source.start(startTime);
    lastEndTimeRef.current = startTime + buffer.duration;

    console.log('Started playing audio buffer');

    source.onended = () => {
      console.log('Audio buffer playback ended');
      if (!isInterruptedRef.current) {
        processAudioQueue();
      }
    };
  };

  const changeTurnEndType = async (value) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;

    if (wavRecorder.getStatus() === 'recording') {
      await wavRecorder.end();
    }

    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.begin();
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    } else if (value === 'none') {
      await wavRecorder.pause();
    }

    client.updateSession({
      turn_detection: value === 'enabled' ? null : { type: 'server_vad' },
    });

    setTurnEndType(value);
    console.log('Turn end type changed to:', value);
  };

  const handleToggleAudio = async () => {
    if (!clientRef.current) return;

    try {
      if (turnEndType === 'none') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioRef.current.srcObject = stream;

        if (wavRecorderRef.current.getStatus() === 'recording') {
          await wavRecorderRef.current.end();
        }

        await changeTurnEndType('server_vad');
        console.log('Audio input enabled');
      } else {
        await changeTurnEndType('none');
        console.log('Audio input disabled');
      }
    } catch (error) {
      console.error('Error toggling audio stream:', error);
    }
  };

  const handleInterruptAI = async () => {
    console.log('handleInterruptAI called');
    console.log('isPlaying:', isPlaying);
    console.log('clientRef.current:', !!clientRef.current);

    if (clientRef.current && isPlaying) {
      try {
        console.log('Attempting to send response.cancel message');
        isInterruptedRef.current = true;

        await clientRef.current.sendMessage({
          type: 'response.cancel'
        });
        console.log('Sent interrupt message to AI');
        
        // Stop current audio playback
        if (currentSourceRef.current) {
          currentSourceRef.current.stop();
          console.log('Stopped current audio playback');
        }
        
        setIsPlaying(false);
        audioQueue.current = [];
        lastEndTimeRef.current = audioContextRef.current.currentTime;
        console.log('Reset audio state');

        // Truncate the conversation to the last played audio
        await clientRef.current.sendMessage({
          type: 'conversation.item.truncate',
          item_id: clientRef.current.conversation.getLastItem().id,
          truncate_to: lastEndTimeRef.current
        });
        console.log('Truncated conversation to last played audio');

        // Reset the interrupted flag after a short delay
        setTimeout(() => {
          isInterruptedRef.current = false;
          console.log('Reset interrupted flag');
        }, 100);

      } catch (error) {
        console.error('Error in handleInterruptAI:', error);
      }
    } else {
      console.log('Conditions not met for interruption');
    }
  };

  return (
    <div className={`${theme.secondary} p-2 rounded-lg h-full flex flex-col`}>
      <div className="flex-grow overflow-y-auto mb-2">
        {messages.map((msg, index) => (
          <div key={index} className={`${theme.text} text-sm mb-1 ${msg.isAi ? 'font-bold' : ''}`}>{msg.text}</div>
        ))}
      </div>
      <div className="flex items-center justify-center">
        <button 
          onClick={handleToggleAudio} 
          className={`${theme.button} p-2 rounded-full`}
          aria-label={turnEndType === 'none' ? 'Start Audio' : 'Stop Audio'}
        >
          <FaMicrophone 
            size={24} 
            color="grey"
            className={turnEndType !== 'none' ? 'animate-pulse' : ''}
          />
        </button>
      </div>
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default RealtimeComponent;
