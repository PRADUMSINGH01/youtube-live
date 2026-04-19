export type VoiceErrorCode = 'SDK_INIT_FAILED' | 'GENERATION_FAILED' | 'FILE_SYSTEM_ERROR';

/**
 * A professional custom error class.
 * This allows us to track EXACTLY what went wrong in our logs.
 */
export class VoiceError extends Error {
  constructor(
    public code: VoiceErrorCode,
    public message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'VoiceError';
  }

  /**
   * Helper to print a clean summary for logs
   */
  public log(): void {
    console.error(`[VoiceError][${this.code}]: ${this.message}`);
    if (this.originalError) {
      console.error('Core Error:', this.originalError);
    }
  }
}
