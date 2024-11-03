import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaMicrophone } from 'react-icons/fa';

const SAMPLE_RATE = 24000;

const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'interactive'
  });
};

class AudioRecorder {
  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.recording = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.audioData = [];
  }

  async start() {
    try {
      this.audioContext = createAudioContext();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        if (this.recording) {
          const audioData = e.inputBuffer.getChannelData(0);
          this.audioData.push(new Float32Array(audioData));
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.recording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.recording = false;
    
    // Combine all audio data
    const combinedLength = this.audioData.reduce((acc, curr) => acc + curr.length, 0);
    const combinedAudio = new Float32Array(combinedLength);
    let offset = 0;
    
    this.audioData.forEach(buffer => {
      combinedAudio.set(buffer, offset);
      offset += buffer.length;
    });
    
    const audioBlob = this.float32ArrayToWav(combinedAudio);
    this.audioData = [];
    return audioBlob;
  }

  float32ArrayToWav(float32Array) {
    const buffer = new ArrayBuffer(44 + float32Array.length * 2);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + float32Array.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, float32Array.length * 2, true);
    
    // Write audio data
    const floatTo16BitPCM = (output, offset, input) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };
    
    floatTo16BitPCM(view, 44, float32Array);
    return new Blob([buffer], { type: 'audio/wav' });
  }
}

const RealtimeComponent = ({ theme, avatarId }) => {
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaitingForChores, setIsWaitingForChores] = useState(false);
  
  const audioRef = useRef(null);
  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);

  useEffect(() => {
    audioContextRef.current = createAudioContext();
    recorderRef.current = new AudioRecorder(SAMPLE_RATE);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (isRecording) {
        handleToggleAudio();
      }
    };
  }, []);

  const playAudio = async (audioBlob) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();
    setIsPlaying(true);
    source.onended = () => setIsPlaying(false);
  };

  const handleToggleAudio = async () => {
    try {
      if (!isRecording) {
        await recorderRef.current.start();
        setIsRecording(true);
      } else {
        const audioBlob = recorderRef.current.stop();
        setIsRecording(false);
        
        // Send audio to your backend
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('avatarId', avatarId);
        
        const response = await axios.post('/api/audio', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data.audioResponse) {
          const audioBlob = new Blob([response.data.audioResponse], { type: 'audio/wav' });
          await playAudio(audioBlob);
        }
        
        if (response.data.message) {
          setMessages(prev => [...prev, { id: prev.length + 1, text: response.data.message, isAi: true }]);
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      setIsRecording(false);
    }
  };

  const fetchChores = async (date) => {
    const formattedDate = date || new Date().toISOString().split('T')[0];
    try {
      const response = await axios.post('/api/chat', { 
        message: `What are the chores for ${formattedDate}?`,
        avatarId: avatarId,
      });

      if (response.status === 200 && response.data.message) {
        return response.data.message;
      } else {
        throw new Error('Unexpected API response format or status');
      }
    } catch (error) {
      console.error('Error getting chores:', error);
      throw error;
    }
  };

  return (
    <div className={`${theme.secondary} p-2 rounded-lg h-full flex flex-col`}>
      <div className="flex-grow overflow-y-auto mb-2">
        {messages.map((msg, index) => (
          <div key={index} className={`${theme.text} text-sm mb-1 ${msg.isAi ? 'font-bold' : ''}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center">
        <button 
          onClick={handleToggleAudio} 
          className={`${theme.button} p-2 rounded-full`}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          <FaMicrophone 
            size={24} 
            color="grey"
            className={isRecording ? 'animate-pulse' : ''}
          />
        </button>
      </div>
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default RealtimeComponent;