import { DeepgramClient } from "@deepgram/sdk";
import fs from 'fs';
import "dotenv/config";
import { VoiceError } from "./VoiceError.js";

/**
 * PRODUCTION-GRADE SERVICE
 * This class encapsulates all logic for voice generation.
 */
export class VoiceService {
  // 'private' means these properties cannot be accessed from outside the class.
  // This is called "Encapsulation".
  private client: any;
  private readonly defaultModel: string = "aura-2-thalia-en";

  /**
   * CONSTRUCTOR
   * This runs once when you do `new VoiceService()`
   */
  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // VALIDATION: After this block, TypeScript "narrows" the type.
    // Inside this 'if', it's undefined. After it, it's definitely a string.
    if (!apiKey) {
      const err = new VoiceError('SDK_INIT_FAILED', 'DEEPGRAM_API_KEY is missing from environment.');
      err.log();
      throw err;
    }

    // Initialize the SDK
    try {
      this.client = new DeepgramClient({ apiKey });
      console.log('✅ VoiceService initialized successfully.');
    } catch (err) {
      throw new VoiceError('SDK_INIT_FAILED', 'Failed to initialize Deepgram SDK', err);
    }
  }

  /**
   * PUBLIC METHOD: The primary interface for other parts of your app.
   * @param text The text to speak
   * @param outputPath Where to save the file
   */
  public async speak(text: string, outputPath: string = "output.wav"): Promise<string> {
    console.log(`🎙️ VoiceService: Generating audio for: "${text.substring(0, 30)}..."`);

    try {
      // 1. GENERATE (Using private internal check for safety)
      const data = await this.fetchAudioFromDeepgram(text);

      // 2. CONVERT TO BUFFER
      const buffer = Buffer.from(await data.arrayBuffer());

      // 3. SAVE TO FILE
      this.saveToFile(buffer, outputPath);

      return outputPath;
    } catch (err: any) {
      // ROBUST ERROR HANDLING: We wrap and categorize the error
      const voiceErr = new VoiceError('GENERATION_FAILED', `Failed to generate voice: ${err.message}`, err);
      voiceErr.log();
      throw voiceErr;
    }
  }

  /**
   * PRIVATE HELPER: Handles the network request
   */
  private async fetchAudioFromDeepgram(text: string): Promise<any> {
    const response = await this.client.speak.v1.audio.generate(
      { text },
      {
        model: this.defaultModel,
        encoding: "linear16",
        container: "wav"
      }
    );

    const { data } = await response;

    if (!data) {
      throw new Error("Deepgram returned an empty response body.");
    }

    return data;
  }

  /**
   * PRIVATE HELPER: Handles the file system
   */
  private saveToFile(buffer: Buffer, path: string): void {
    try {
      fs.writeFileSync(path, buffer);
      console.log(`💾 Audio saved to: ${path}`);
    } catch (err) {
      throw new VoiceError('FILE_SYSTEM_ERROR', `Could not write to path: ${path}`, err);
    }
  }
}

// --- TEST USAGE ---
// This part only runs if you run this file directly.
if (process.argv[1]?.includes('VoiceService')) {
  const voice = new VoiceService();
  voice.speak("Learning TypeScript classes is the first step to becoming a senior developer.")
    .then(path => console.log('🎉 Final Result:', path))
    .catch(err => console.error('💀 Test Failed!'));
}
