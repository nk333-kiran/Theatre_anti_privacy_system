"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("@antipiracy/database");
class TokenService {
    /**
     * Hashes a JWT token to store safely without exposing the raw bearer token in database.
     */
    static hashToken(token) {
        return crypto_1.default.createHash("sha256").update(token).digest("hex");
    }
    /**
     * Revokes a JWT token and stores its hash in PostgreSQL.
     */
    static async revokeToken(token, userId, reason) {
        const tokenHash = this.hashToken(token);
        // Estimate expiration from decoded payload or default to 24h
        let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.exp) {
                expiresAt = new Date(decoded.exp * 1000);
            }
        }
        catch {
            // Use fallback expiresAt
        }
        await database_1.prisma.revokedToken.upsert({
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
    static async isTokenRevoked(token) {
        const tokenHash = this.hashToken(token);
        const record = await database_1.prisma.revokedToken.findUnique({
            where: { tokenHash },
        });
        return !!record;
    }
    /**
     * Cleans up expired token blacklist entries.
     */
    static async cleanupExpiredTokens() {
        const res = await database_1.prisma.revokedToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return res.count;
    }
}
exports.TokenService = TokenService;
