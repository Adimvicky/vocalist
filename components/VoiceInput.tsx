'use client';

import { useState, useRef, useEffect } from 'react';
import { AudioRecorder } from '@/lib/audioRecorder';
import { useVoice } from '@/contexts/VoiceContext';

interface VoiceInputProps {
  onCommand: (command: string, isVoiceInput: boolean) => void;
  onAddTask: (text: string, isVoiceInput: boolean) => void;
}

export default function VoiceInput({ onCommand, onAddTask }: VoiceInputProps) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const recorderRef = useRef<AudioRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedSpeechRef = useRef(false);

  const {
    settings,
    isContinuousListening,
    isWakeWordListening,
    startContinuousListening,
    stopContinuousListening,
    interimTranscript,
    setOnWakeWordDetected,
    startWakeWord,
    stopWakeWord,
  } = useVoice();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddTask(inputText.trim(), false); // Text input, not voice
      setInputText('');
    }
  };

  // Handle wake word detection
  useEffect(() => {
    setOnWakeWordDetected(() => {
      console.log('Wake word callback triggered');
      handleVoiceRecord();
    });
  }, [setOnWakeWordDetected]);

  // Handle continuous listening command
  const handleContinuousCommand = async (command: string) => {
    setTranscript(command);
    onCommand(command, true); // Voice input
  };

  // Toggle continuous listening
  useEffect(() => {
    if (settings.continuousListening && !isContinuousListening) {
      startContinuousListening(handleContinuousCommand);
    } else if (!settings.continuousListening && isContinuousListening) {
      stopContinuousListening();
    }
  }, [settings.continuousListening]);

  // Handle ESC key to stop continuous listening
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isContinuousListening) {
        stopContinuousListening();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isContinuousListening, stopContinuousListening]);

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Manually stop recording
      stopRecording();
    } else {
      // Start recording with silence detection
      try {
        setError(null);
        setTranscript('');
        setInterimText('');
        hasReceivedSpeechRef.current = false;

        // Temporarily stop wake word detection to avoid conflicts
        if (settings.wakeWordEnabled && isWakeWordListening) {
          stopWakeWord();
        }

        setIsRecording(true);

        // Wait a moment for wake word detector to fully stop before starting voice input
        await new Promise(resolve => setTimeout(resolve, 1000));

        // @ts-ignore - Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
          throw new Error('Speech recognition not supported');
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Keep listening
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          hasReceivedSpeechRef.current = true;

          // Clear any existing silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          const last = event.results.length - 1;
          const result = event.results[last];
          const text = result[0].transcript;

          if (result.isFinal) {
            // Final result - show it and wait for more or silence
            setInterimText('');
            setTranscript(text);

            // Start silence timer - if no more speech in 2 seconds, process command
            silenceTimerRef.current = setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
                onCommand(text, true);
              }
            }, 2000);
          } else {
            // Interim result - show what's being said
            setInterimText(text);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.log('Speech recognition error:', event.error);

          // Handle 'aborted' errors - try to restart
          if (event.error === 'aborted') {
            console.log('Speech recognition aborted - attempting restart...');

            // If we haven't received speech yet, try restarting
            if (!hasReceivedSpeechRef.current && isRecording) {
              setTimeout(() => {
                if (recognitionRef.current && isRecording) {
                  try {
                    console.log('Restarting speech recognition...');
                    recognitionRef.current.start();
                  } catch (e) {
                    console.error('Failed to restart:', e);
                  }
                }
              }, 100);
            }
            return;
          }

          // Ignore 'no-speech' errors - user just didn't say anything
          if (event.error === 'no-speech') {
            console.log('No speech detected');
            setIsRecording(false);
            setInterimText('');
            return;
          }

          console.error('Speech recognition error:', event.error);
          setError(`Recognition error: ${event.error}`);
          setIsRecording(false);
          setInterimText('');
        };

        recognitionRef.current.onend = () => {
          // Clear silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // Recognition ended
          setIsRecording(false);
          setInterimText('');

          // If we never received any speech, it ended too quickly
          if (!hasReceivedSpeechRef.current) {
            console.log('Voice input ended before receiving speech');
          }

          // Restart wake word detection if it was enabled
          if (settings.wakeWordEnabled) {
            setTimeout(() => {
              startWakeWord();
            }, 500); // Small delay to ensure clean restart
          }
        };

        recognitionRef.current.start();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    setIsRecording(false);
    setInterimText('');

    // Restart wake word detection if it was enabled
    if (settings.wakeWordEnabled) {
      setTimeout(() => {
        startWakeWord();
      }, 500);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border-2 border-white/50">
      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a task or use voice input..."
          className="flex-1 px-5 py-4 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-500 bg-white text-gray-900 placeholder-gray-400 text-lg font-medium shadow-sm"
          aria-label="Task input"
        />
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          disabled={!inputText.trim()}
        >
          Add Task
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-400 border-2 border-red-500 rounded-xl shadow-lg">
          <p className="text-sm text-white font-semibold">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleVoiceRecord}
          className={`flex-1 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer ${
            isRecording
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 animate-pulse'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 bg-white rounded-full"></span>
              Stop Recording
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Use Voice
            </span>
          )}
        </button>
      </div>

      {/* Status Indicators */}
      <div className="mt-4 space-y-2">
        {isWakeWordListening && (
          <div className="p-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl shadow-lg border-2 border-purple-500 animate-pulse">
            <p className="text-sm text-white font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-white rounded-full"></span>
              Wake word active - Say "vocalist" to activate
            </p>
          </div>
        )}

        {isContinuousListening && (
          <div className="p-3 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl shadow-lg border-2 border-orange-500">
            <p className="text-sm text-white font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Continuous listening active - Press ESC to stop
            </p>
          </div>
        )}

        {interimTranscript && isContinuousListening && (
          <div className="p-3 bg-blue-100 border-2 border-blue-300 rounded-xl">
            <p className="text-sm text-blue-900 font-semibold">
              <strong>Listening:</strong> {interimTranscript}
            </p>
          </div>
        )}

        {interimText && isRecording && (
          <div className="p-3 bg-blue-100 border-2 border-blue-300 rounded-xl animate-pulse">
            <p className="text-sm text-blue-900 font-semibold">
              <strong>Listening:</strong> {interimText}
            </p>
          </div>
        )}

        {transcript && (
          <div className="p-4 bg-gradient-to-r from-green-600 to-cyan-600 rounded-xl shadow-lg border-2 border-green-700 relative flex items-center">
            <p className="text-base text-white font-semibold pr-10 flex-1">
              <strong>Transcript:</strong> {transcript}
            </p>
            <button
              onClick={() => setTranscript('')}
              className="absolute right-2 p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-all cursor-pointer"
              aria-label="Clear transcript"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
