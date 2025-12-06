export class WakeWordDetector {
  private recognition: any; // SpeechRecognition
  private isActive: boolean = false;
  private onWakeWordDetected: () => void;
  private wakeWord: string = 'vocalist';
  private lastDetectionTime: number = 0;
  private debounceMs: number = 3000; // Prevent multiple detections within 3 seconds

  constructor(onDetected: () => void) {
    this.onWakeWordDetected = onDetected;

    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      if (transcript.includes(this.wakeWord)) {
        const now = Date.now();

        // Debounce: ignore if detected recently
        if (now - this.lastDetectionTime < this.debounceMs) {
          console.log('Wake word detected but debounced (too soon)');
          return;
        }

        console.log('Wake word detected:', transcript);
        this.lastDetectionTime = now;

        // Stop immediately to prevent re-detection
        this.stop();

        // Trigger callback
        this.onWakeWordDetected();
      }
    };

    this.recognition.onerror = (event: any) => {
      // Ignore 'aborted' errors - these happen when we intentionally stop for voice input
      if (event.error === 'aborted') {
        console.log('Wake word detection paused for voice input');
        return;
      }

      // Ignore 'no-speech' errors - just restart
      if (event.error === 'no-speech') {
        console.log('Wake word: no speech detected, restarting...');
        if (this.isActive) {
          setTimeout(() => this.start(), 1000);
        }
        return;
      }

      console.error('Wake word detection error:', event.error);
      if (event.error === 'audio-capture') {
        // Restart on audio capture errors
        if (this.isActive) {
          setTimeout(() => this.start(), 1000);
        }
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if still active
      if (this.isActive) {
        setTimeout(() => this.recognition.start(), 100);
      }
    };
  }

  start(): void {
    if (!this.isActive) {
      this.isActive = true;
      try {
        this.recognition.start();
        console.log('Wake word detection started');
      } catch (e) {
        console.error('Error starting wake word detection:', e);
      }
    }
  }

  stop(): void {
    console.log('Stopping wake word detection...');
    this.isActive = false;

    // Make absolutely sure it won't restart
    if (this.recognition) {
      // Remove event handlers temporarily to prevent restart on stop
      const oldOnend = this.recognition.onend;
      this.recognition.onend = null;

      try {
        this.recognition.stop();
        console.log('Wake word detection stopped');
      } catch (e) {
        console.log('Wake word already stopped');
      }

      // Restore onend after a delay
      setTimeout(() => {
        if (this.recognition) {
          this.recognition.onend = oldOnend;
        }
      }, 1500);
    }
  }

  isListening(): boolean {
    return this.isActive;
  }
}
