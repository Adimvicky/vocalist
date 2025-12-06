'use client';

import { useVoice } from '@/contexts/VoiceContext';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceSettings({ isOpen, onClose }: VoiceSettingsProps) {
  const { settings, updateSettings, speak } = useVoice();

  if (!isOpen) return null;

  const handleTestVoice = async () => {
    await speak('This is how I sound with the current voice setting.');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-white/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Voice Settings</h2>
          <p className="text-white/90 mt-1">Customize your voice experience</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Text-to-Speech Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-purple-300 pb-2">
              Voice Output (Text-to-Speech)
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-gray-800 font-semibold">Enable Voice Responses</label>
                <p className="text-sm text-gray-600">App will speak back confirmations</p>
              </div>
              <button
                onClick={() => updateSettings({ ttsEnabled: !settings.ttsEnabled })}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${
                  settings.ttsEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.ttsEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {settings.ttsEnabled && (
              <>
                <div>
                  <label className="text-gray-800 font-semibold block mb-2">Voice Selection</label>
                  <select
                    value={settings.ttsVoice}
                    onChange={(e) =>
                      updateSettings({
                        ttsVoice: e.target.value as typeof settings.ttsVoice,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-400 bg-white text-gray-900 font-medium cursor-pointer"
                  >
                    <option value="alloy">Alloy (Neutral)</option>
                    <option value="echo">Echo (Male)</option>
                    <option value="fable">Fable (Warm)</option>
                    <option value="onyx">Onyx (Deep)</option>
                    <option value="nova">Nova (Female)</option>
                    <option value="shimmer">Shimmer (Soft)</option>
                  </select>
                </div>

                <button
                  onClick={handleTestVoice}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
                >
                  Test Voice
                </button>
              </>
            )}
          </div>

          {/* Wake Word Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-purple-300 pb-2">
              Wake Word Detection
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-gray-800 font-semibold">Enable Wake Word</label>
                <p className="text-sm text-gray-600">Say "vocalist" to activate voice input</p>
              </div>
              <button
                onClick={() => updateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${
                  settings.wakeWordEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.wakeWordEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {settings.wakeWordEnabled && (
              <div className="p-4 bg-blue-100 border-2 border-blue-300 rounded-xl">
                <p className="text-sm text-blue-900 font-semibold">
                  Wake word is active! Say "vocalist" followed by your command.
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Example: "Vocalist, add buy groceries"
                </p>
              </div>
            )}
          </div>

          {/* Continuous Listening Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-purple-300 pb-2">
              Continuous Listening
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-gray-800 font-semibold">Continuous Mode</label>
                <p className="text-sm text-gray-600">Keep listening without button clicks</p>
              </div>
              <button
                onClick={() => updateSettings({ continuousListening: !settings.continuousListening })}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${
                  settings.continuousListening ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.continuousListening ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {settings.continuousListening && (
              <>
                <div>
                  <label className="text-gray-800 font-semibold block mb-2">
                    Silence Timeout: {settings.silenceTimeout}s
                  </label>
                  <p className="text-sm text-gray-600 mb-2">
                    Auto-stop after this many seconds of silence
                  </p>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="10"
                    value={settings.silenceTimeout}
                    onChange={(e) =>
                      updateSettings({ silenceTimeout: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-purple-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>10s</span>
                    <span>120s</span>
                  </div>
                </div>

                <div className="p-4 bg-yellow-100 border-2 border-yellow-300 rounded-xl">
                  <p className="text-sm text-yellow-900 font-semibold">
                    ⚠️ Continuous mode uses more battery
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    The microphone will stay active. Press ESC to stop anytime.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Visual Feedback */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-purple-300 pb-2">
              Visual Feedback
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-gray-800 font-semibold">Show Visual Indicators</label>
                <p className="text-sm text-gray-600">Display waveforms and listening status</p>
              </div>
              <button
                onClick={() => updateSettings({ visualFeedback: !settings.visualFeedback })}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${
                  settings.visualFeedback ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.visualFeedback ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white p-6 border-t-2 border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-bold text-lg shadow-lg hover:shadow-xl cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
