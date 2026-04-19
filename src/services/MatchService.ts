import { addJob } from "../queue/Producer.js";

const API_URL = "https://cricket-api-6y57msgvna-uc.a.run.app/matches/live";

export async function syncLiveMatches() {
    console.log("📡 Fetching live matches from API...");
    try {
        const response = await fetch(API_URL);
        const matches = await response.json();

        console.log(`📊 Found ${matches.length} matches. Processing...`);

        for (const match of matches) {
            // Calculate delay
            const startTime = new Date(match.startTime).getTime();
            const now = Date.now();

            // Start 5 minutes before the actual start time if it's in the future
            const buffer = 5 * 60 * 1000;
            const scheduledTime = startTime - buffer;
            const delay = Math.max(0, scheduledTime - now);

            // Skip finished matches
            if (match.state === "FINISHED" || match.stage === "FINISHED") {
                console.log(`⏩ Skipping finished match: ${match.slug}`);
                continue;
            }

            // Filter for IPL only
            const isIPL = match.series?.name === "IPL" ||
                match.series?.longName?.includes("Indian Premier League") ||
                match.slug?.includes("ipl");

            if (!isIPL) {
                console.log(`⏩ Skipping non-IPL match: ${match.slug}`);
                continue;
            }

            // Schedule the job
            await addJob("fix-match", {
                matchId: match.id,
                title: match.title,
                slug: match.slug,
                startTime: match.startTime
            }, {
                jobId: `match-${match.id}`, // Prevent duplicate scheduling
                delay
            });

            if (delay === 0) {
                console.log(`✅ Started Immediately: ${match.slug}`);
            } else {
                console.log(`📅 Scheduled: ${match.slug} in ${Math.round(delay / 1000 / 60)} mins`);
            }
        }

        console.log("🏁 Match sync complete!");
    } catch (error) {
        console.error("❌ Error syncing matches:", error);
    }
}
