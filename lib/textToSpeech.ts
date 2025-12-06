export class TextToSpeech {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  async speak(text: string, voice: string = 'alloy'): Promise<void> {
    try {
      // Stop any currently playing audio
      this.stop();

      // Fetch audio from OpenAI TTS API
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBuffer = await response.arrayBuffer();

      // Initialize AudioContext if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Decode and play audio
      const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer);
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = decodedAudio;
      this.currentSource.connect(this.audioContext.destination);
      this.currentSource.start(0);

      // Return promise that resolves when audio finishes
      return new Promise((resolve) => {
        if (this.currentSource) {
          this.currentSource.onended = () => resolve();
        }
      });
    } catch (error) {
      console.error('Error speaking:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }
  }
}
