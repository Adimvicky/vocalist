export class ContinuousListener {
  private recognition: any; // SpeechRecognition
  private isActive: boolean = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private onCommand: (text: string) => void;
  private onTranscriptUpdate: (text: string, isFinal: boolean) => void;
  private silenceTimeout: number = 30000; // 30 seconds

  constructor(
    onCommand: (text: string) => void,
    onTranscriptUpdate?: (text: string, isFinal: boolean) => void
  ) {
    this.onCommand = onCommand;
    this.onTranscriptUpdate = onTranscriptUpdate || (() => {});

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
      const result = event.results[last];
      const transcript = result[0].transcript;

      this.onTranscriptUpdate(transcript, result.isFinal);

      if (result.isFinal) {
        console.log('Final transcript:', transcript);
        this.onCommand(transcript);
        this.resetSilenceTimer();
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Continuous listening error:', event.error);
    };

    this.recognition.onend = () => {
      // Auto-restart if still active
      if (this.isActive) {
        setTimeout(() => {
          try {
            this.recognition.start();
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }, 100);
      }
    };
  }

  start(): void {
    if (!this.isActive) {
      this.isActive = true;
      try {
        this.recognition.start();
        this.resetSilenceTimer();
        console.log('Continuous listening started');
      } catch (e) {
        console.error('Error starting continuous listening:', e);
      }
    }
  }

  stop(): void {
    this.isActive = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    try {
      this.recognition.stop();
      console.log('Continuous listening stopped');
    } catch (e) {
      // Already stopped
    }
  }

  isListening(): boolean {
    return this.isActive;
  }

  setSilenceTimeout(milliseconds: number): void {
    this.silenceTimeout = milliseconds;
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      console.log('Silence timeout reached, stopping continuous listening');
      this.stop();
    }, this.silenceTimeout);
  }
}
