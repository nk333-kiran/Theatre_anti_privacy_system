import crypto from "crypto";

export class NotificationDeduplicationService {
  private static recentCache: Map<string, number> = new Map();
  private static readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minute deduplication cooldown

  /**
   * Generate canonical deduplication key.
   */
  public static generateKey(category: string, subjectId?: string, reasonSnippet?: string): string {
    const raw = `${category}:${subjectId || "GLOBAL"}:${(reasonSnippet || "").trim().substring(0, 30)}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Check if a notification is duplicate / in cooldown window.
   */
  public static isDuplicate(dedupKey: string): boolean {
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
