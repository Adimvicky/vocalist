'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { TextToSpeech } from '@/lib/textToSpeech';
import { WakeWordDetector } from '@/lib/wakeWordDetector';
import { ContinuousListener } from '@/lib/continuousListener';
import { VoiceSettings, loadVoiceSettings, saveVoiceSettings } from '@/lib/voiceSettings';

interface VoiceContextType {
  settings: VoiceSettings;
  updateSettings: (newSettings: Partial<VoiceSettings>) => void;
  speak: (text: string) => Promise<void>;
  isWakeWordListening: boolean;
  isContinuousListening: boolean;
  startWakeWord: () => void;
  stopWakeWord: () => void;
  startContinuousListening: (onCommand: (text: string) => void) => void;
  stopContinuousListening: () => void;
  interimTranscript: string;
  onWakeWordDetected?: () => void;
  setOnWakeWordDetected: (callback: () => void) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings());
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const ttsRef = useRef<TextToSpeech | null>(null);
  const wakeWordRef = useRef<WakeWordDetector | null>(null);
  const continuousListenerRef = useRef<ContinuousListener | null>(null);
  const onWakeWordDetectedRef = useRef<(() => void) | undefined>(undefined);

  // Initialize TTS on mount
  useEffect(() => {
    ttsRef.current = new TextToSpeech();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveVoiceSettings(updated);
      return updated;
    });
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (settings.ttsEnabled && ttsRef.current) {
      try {
        await ttsRef.current.speak(text, settings.ttsVoice);
      } catch (error) {
        console.error('Error speaking:', error);
      }
    }
  }, [settings.ttsEnabled, settings.ttsVoice]);

  const setOnWakeWordDetected = useCallback((callback: () => void) => {
    onWakeWordDetectedRef.current = callback;
  }, []);

  const startWakeWord = useCallback(() => {
    if (!wakeWordRef.current && typeof window !== 'undefined') {
      try {
        wakeWordRef.current = new WakeWordDetector(() => {
          console.log('Wake word detected in context');
          if (onWakeWordDetectedRef.current) {
            onWakeWordDetectedRef.current();
          }
        });
        wakeWordRef.current.start();
        setIsWakeWordListening(true);
      } catch (error) {
        console.error('Error starting wake word detection:', error);
      }
    } else if (wakeWordRef.current) {
      wakeWordRef.current.start();
      setIsWakeWordListening(true);
    }
  }, []);

  const stopWakeWord = useCallback(() => {
    if (wakeWordRef.current) {
      wakeWordRef.current.stop();
      setIsWakeWordListening(false);
    }
  }, []);

  const startContinuousListening = useCallback((onCommand: (text: string) => void) => {
    if (!continuousListenerRef.current && typeof window !== 'undefined') {
      try {
        continuousListenerRef.current = new ContinuousListener(
          onCommand,
          (text, isFinal) => {
            if (!isFinal) {
              setInterimTranscript(text);
            } else {
              setInterimTranscript('');
            }
          }
        );
        continuousListenerRef.current.setSilenceTimeout(settings.silenceTimeout * 1000);
        continuousListenerRef.current.start();
        setIsContinuousListening(true);
      } catch (error) {
        console.error('Error starting continuous listening:', error);
      }
    } else if (continuousListenerRef.current) {
      continuousListenerRef.current.start();
      setIsContinuousListening(true);
    }
  }, [settings.silenceTimeout]);

  const stopContinuousListening = useCallback(() => {
    if (continuousListenerRef.current) {
      continuousListenerRef.current.stop();
      setIsContinuousListening(false);
      setInterimTranscript('');
    }
  }, []);

  // Auto-start/stop wake word based on settings
  useEffect(() => {
    if (settings.wakeWordEnabled && !isWakeWordListening) {
      startWakeWord();
    } else if (!settings.wakeWordEnabled && isWakeWordListening) {
      stopWakeWord();
    }
  }, [settings.wakeWordEnabled, isWakeWordListening, startWakeWord, stopWakeWord]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeWordRef.current) {
        wakeWordRef.current.stop();
      }
      if (continuousListenerRef.current) {
        continuousListenerRef.current.stop();
      }
      if (ttsRef.current) {
        ttsRef.current.stop();
      }
    };
  }, []);

  const value: VoiceContextType = {
    settings,
    updateSettings,
    speak,
    isWakeWordListening,
    isContinuousListening,
    startWakeWord,
    stopWakeWord,
    startContinuousListening,
    stopContinuousListening,
    interimTranscript,
    setOnWakeWordDetected,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
