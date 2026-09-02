"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDeduplicationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class NotificationDeduplicationService {
    static recentCache = new Map();
    static COOLDOWN_MS = 5 * 60 * 1000; // 5 minute deduplication cooldown
    /**
     * Generate canonical deduplication key.
     */
    static generateKey(category, subjectId, reasonSnippet) {
        const raw = `${category}:${subjectId || "GLOBAL"}:${(reasonSnippet || "").trim().substring(0, 30)}`;
        return crypto_1.default.createHash("sha256").update(raw).digest("hex");
    }
    /**
     * Check if a notification is duplicate / in cooldown window.
     */
    static isDuplicate(dedupKey) {
        const now = Date.now();
        const lastTime = this.recentCache.get(dedupKey);
        if (lastTime && now - lastTime < this.COOLDOWN_MS) {
            return true;
        }
        this.recentCache.set(dedupKey, now);
        // Garbage collect entries older than cooldown
        if (this.recentCache.size > 5000) {
            for (const [k, timestamp] of this.recentCache.entries()) {
                if (now - timestamp > this.COOLDOWN_MS) {
                    this.recentCache.delete(k);
                }
            }
        }
        return false;
    }
}
exports.NotificationDeduplicationService = NotificationDeduplicationService;
