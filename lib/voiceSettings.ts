export interface VoiceSettings {
  // TTS Settings
  ttsEnabled: boolean;
  ttsVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

  // Wake Word Settings
  wakeWordEnabled: boolean;

  // Continuous Listening Settings
  continuousListening: boolean;
  silenceTimeout: number; // seconds

  // Visual Feedback
  visualFeedback: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  ttsEnabled: true,
  ttsVoice: 'alloy',
  wakeWordEnabled: false,
  continuousListening: false,
  silenceTimeout: 30,
  visualFeedback: true,
};

const STORAGE_KEY = 'vocalist_voice_settings';

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading voice settings:', e);
  }

  return DEFAULT_VOICE_SETTINGS;
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving voice settings:', e);
  }
}
