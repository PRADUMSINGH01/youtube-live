import puppeteer from "puppeteer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { PassThrough } from "stream";
import dotenv from "dotenv";

dotenv.config();

// Initialize FFmpeg path
const ffmpegPath = typeof ffmpegStatic === 'string' ? ffmpegStatic : (ffmpegStatic as any).default;
if (typeof ffmpegPath === 'string') {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface StreamOptions {
    url: string;
    streamKey: string;
    rtmpUrl?: string;
    fps?: number;
    width?: number;
    height?: number;
    durationMinutes?: number;
}

export class StreamEngine {
    private browser: puppeteer.Browser | null = null;
    private isStreaming: boolean = false;

    async start(options: StreamOptions) {
        const {
            url,
            streamKey,
            rtmpUrl = process.env.YOUTUBE_RTMP_URL,
            fps = 8,
            width = 1024,
            height = 576,
            durationMinutes = 60
        } = options;

        if (!rtmpUrl || !streamKey || streamKey === "PASTE_YOUR_STREAM_KEY_HERE") {
            throw new Error("❌ Missing YouTube RTMP URL or Stream Key. Check your .env file.");
        }

        const destination = `${rtmpUrl}/${streamKey}`;
        console.log(`🚀 [V2.0] Starting stream to: ${rtmpUrl} (Match URL: ${url})`);

        // 1. Launch Browser with optimized args for Cloud Run
        console.log("🛠️ Launching Chromium...");
        this.browser = await puppeteer.launch({
            headless: "new" as any,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium", 
            timeout: 60000, 
            dumpio: true, // This sends browser logs to our console
            args: [
                `--window-size=${width},${height}`, 
                "--no-sandbox", 
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
                "--no-first-run",
                "--no-zygote"
            ]
        });
        console.log("✅ Browser launched successfully!");
        const page = await this.browser.newPage();
        await page.setViewport({ width, height });
        
        console.log(`🌐 Loading page: ${url}`);
        await page.goto(url, { waitUntil: "networkidle2" });

        // 2. Setup FFmpeg
        const stream = new PassThrough();
        const ffmpegProcess = ffmpeg()
            .input(stream)
            .inputFormat('image2pipe')
            .inputFPS(fps)
            .input('anullsrc')
            .inputFormat('lavfi')
            .videoCodec('libx264')
            .audioCodec('aac')
            .format('flv')
            .outputOptions([
                '-pix_fmt yuv420p',
                '-preset ultrafast',
                '-tune zerolatency',
                '-b:v 1500k',        // Moderate bitrate for stability
                '-maxrate 1500k',
                '-bufsize 3000k',
                '-g 16',             // Keyframe every 2 seconds (at 8fps)
                '-shortest',
                `-t ${durationMinutes * 60}`
            ])
            .on('start', (cmd) => console.log('✅ FFmpeg streaming started:', cmd))
            .on('progress', (p) => console.log(`📊 Stream Progress: ${p.frames} frames sent | Bitrate: ${p.currentKbps}kbps`))
            .on('error', (err) => console.error('❌ FFmpeg error:', err.message))
            .on('end', () => {
                console.log('🏁 Stream ended.');
                this.stop();
            });

        // Start FFmpeg
        ffmpegProcess.save(destination);

        // 3. Capture Loop
        this.isStreaming = true;
        const startTime = Date.now();
        const frameInterval = 1000 / fps;
        let frameCount = 0;

        try {
            while (this.isStreaming) {
                const now = Date.now();
                
                if (now - startTime > durationMinutes * 60 * 1000) break;

                const screenshot = await page.screenshot({ 
                    type: 'jpeg', 
                    quality: 60,
                    optimizeForSpeed: true 
                });
                
                if (stream.writable) {
                    stream.write(screenshot);
                    frameCount++;
                    if (frameCount % 20 === 0) console.log(`📸 Captured ${frameCount} frames...`);
                } else {
                    break;
                }

                const elapsed = Date.now() - now;
                await new Promise(res => setTimeout(res, Math.max(0, frameInterval - elapsed)));
            }
        }
 catch (err) {
            console.error("❌ Capture loop error:", err);
        } finally {
            stream.end();
            await this.stop();
        }
    }

    async stop() {
        console.log("🛑 Stopping stream engine...");
        this.isStreaming = false;
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
