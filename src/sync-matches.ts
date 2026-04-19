import { syncLiveMatches } from "./services/MatchService.js";

console.log("🚀 Starting Cricket Match Sync Engine...");

syncLiveMatches()
    .then(() => {
        console.log("✅ Sync finalized.");
        // We don't exit if we want the connection to stay open for other things, 
        // but for a standalone script, we exit after success.
        setTimeout(() => process.exit(0), 1000);
    })
    .catch((err) => {
        console.error("💥 Fatal error during sync:", err);
        process.exit(1);
    });
