import { dbService } from "./dbService";

const CACHE_CLEAR_INTERVAL = 1000 * 60 * 60; // 1 hour in milliseconds
const LAST_CLEAR_KEY = "cache_last_global_clear";

class CachePolicyService {
    /**
     * Initializes the cache policy, checking if a clear is needed immediately
     * and setting up an interval for future clears while the app is running.
     */
    async init(): Promise<void> {
        console.log("[CachePolicyService] Initializing...");

        // Check immediately on startup
        await this.checkAndClearIfNeeded();

        // Set up periodic check every minute to handle long-running tabs
        setInterval(() => {
            this.checkAndClearIfNeeded().catch(console.error);
        }, 60000);
    }

    private async checkAndClearIfNeeded(): Promise<void> {
        const lastClear = localStorage.getItem(LAST_CLEAR_KEY);
        const now = Date.now();

        if (!lastClear) {
            console.log("[CachePolicyService] No last clear time found. Setting initial timestamp.");
            localStorage.setItem(LAST_CLEAR_KEY, now.toString());
            return;
        }

        const lastClearTime = parseInt(lastClear, 10);
        const timeSinceLastClear = now - lastClearTime;

        if (timeSinceLastClear >= CACHE_CLEAR_INTERVAL) {
            console.log(`[CachePolicyService] ${timeSinceLastClear / 1000 / 60} minutes since last clear. Clearing cache...`);

            try {
                await dbService.clearAllCache();
                localStorage.setItem(LAST_CLEAR_KEY, now.toString());
                console.log("[CachePolicyService] Cache cleared successfully.");
            } catch (error) {
                console.error("[CachePolicyService] Failed to clear cache:", error);
            }
        } else {
            const remaining = (CACHE_CLEAR_INTERVAL - timeSinceLastClear) / 1000 / 60;
            console.log(`[CachePolicyService] Cache is still fresh. Next clear in ${remaining.toFixed(1)} minutes.`);
        }
    }

    /**
     * Manually triggers a cache clear and resets the timer
     */
    async forceClear(): Promise<void> {
        await dbService.clearAllCache();
        localStorage.setItem(LAST_CLEAR_KEY, Date.now().toString());
    }
}

export const cachePolicyService = new CachePolicyService();
export default cachePolicyService;
