import { Worker } from "bullmq";
import { redis } from "../utils/redis.server.js";
import { StreamEngine } from "../services/StreamEngine.js";
import http from "http";

// Health check server for Cloud Run
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Worker is alive");
}).listen(process.env.PORT || 8080);

const engine = new StreamEngine();

const worker = new Worker("youtube-live", async (job) => {
    console.log(`🚀 Processing Job: ${job.id} (${job.name})`);

    if (job.name === "fix-match" || job.name === "start-stream") {
        const { matchId, slug, title } = job.data;
        console.log(`🎬 Starting Live Stream for: ${title || slug}`);

        // Default to your Vercel dashboard
        const targetUrl = job.data.url || `https://bot-dashboard-three.vercel.app/`;

        try {
            await engine.start({
                url: targetUrl,
                streamKey: process.env.YOUTUBE_STREAM_KEY || "PASTE_YOUR_STREAM_KEY_HERE",
                durationMinutes: 5 // Start with 5 mins for testing
            });
            console.log(`✅ Stream for ${matchId} finished successfully.`);
        } catch (err: any) {
            console.error(`❌ Stream failed: ${err.message}`);
            throw err; // Allow BullMQ to retry if configured
        }
    } else {
        console.log(`❓ Unknown job type: ${job.name}`);
    }
}, {
    connection: redis,
    lockDuration: 1000 * 60 * 10 // 10 minute lock for long-running streams
});

console.log("👷 Worker is running with Streaming Engine enabled...");