import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@antipiracy/database";
import { env } from "../../config/envValidator";

export class TokenService {
  /**
   * Hashes a JWT token to store safely without exposing the raw bearer token in database.
   */
  public static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Revokes a JWT token and stores its hash in PostgreSQL.
   */
  public static async revokeToken(token: string, userId: string, reason?: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    // Estimate expiration from decoded payload or default to 24h
    let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      const decoded = jwt.decode(token) as { exp?: number };
      if (decoded && decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000);
      }
    } catch {
      // Use fallback expiresAt
    }

    await prisma.revokedToken.upsert({
      where: { tokenHash },
      create: {
        tokenHash,
        userId,
        expiresAt,
        reason: reason || "User logged out / token revoked",
      },
      update: {
        reason: reason || "Token re-revoked",
      },
    });
  }

  /**
   * Checks whether a token has been revoked / blacklisted.
   */
  public static async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const record = await prisma.revokedToken.findUnique({
      where: { tokenHash },
    });
    return !!record;
  }

  /**
   * Cleans up expired token blacklist entries.
   */
  public static async cleanupExpiredTokens(): Promise<number> {
    const res = await prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return res.count;
  }
}
