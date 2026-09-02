"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskEscalationEngine = exports.RiskEscalationEngine = void 0;
const database_1 = require("@antipiracy/database");
const logger_1 = require("../logging/logger");
class RiskEscalationEngine {
    entityScores = new Map();
    getRiskLevel(score) {
        if (score <= 19)
            return "LOW";
        if (score <= 39)
            return "GUARDED";
        if (score <= 59)
            return "ELEVATED";
        if (score <= 79)
            return "HIGH";
        return "CRITICAL";
    }
    getKey(entityType, entityId) {
        return `${entityType}:${entityId}`;
    }
    /**
     * Applies an incoming event to escalate risk score
     */
    async escalateRisk(event) {
        const affectedEntities = [];
        affectedEntities.push({ type: "OVERALL", id: "GLOBAL" });
        if (event.theatreId)
            affectedEntities.push({ type: "THEATRE", id: event.theatreId });
        if (event.showId)
            affectedEntities.push({ type: "SHOW", id: event.showId });
        if (event.movieId)
            affectedEntities.push({ type: "MOVIE", id: event.movieId });
        if (event.playbackSessionId)
            affectedEntities.push({ type: "SESSION", id: event.playbackSessionId });
        let severityDelta = 5;
        if (event.severity === "MEDIUM")
            severityDelta = 15;
        if (event.severity === "HIGH")
            severityDelta = 30;
        if (event.severity === "CRITICAL")
            severityDelta = 50;
        const updatedStates = [];
        for (const ent of affectedEntities) {
            const key = this.getKey(ent.type, ent.id);
            const existing = this.entityScores.get(key) || {
                entityType: ent.type,
                entityId: ent.id,
                currentScore: 0,
                riskLevel: "LOW",
                lastUpdatedAt: Date.now(),
                contributingEventCount: 0,
            };
            const previousScore = existing.currentScore;
            const newScore = Math.min(100, existing.currentScore + severityDelta);
            const newLevel = this.getRiskLevel(newScore);
            const newState = {
                ...existing,
                currentScore: newScore,
                riskLevel: newLevel,
                lastUpdatedAt: Date.now(),
                contributingEventCount: existing.contributingEventCount + 1,
            };
            this.entityScores.set(key, newState);
            updatedStates.push(newState);
            // Persist Risk History if score increased noticeably
            if (newScore !== previousScore) {
                database_1.prisma.riskHistory
                    .create({
                    data: {
                        entityType: ent.type,
                        entityId: ent.id,
                        previousScore,
                        newScore,
                        reason: `Escalated by ${event.eventType} (${event.severity})`,
                        correlationId: event.correlationId,
                    },
                })
                    .catch((err) => {
                    logger_1.logger.warn(`[RiskEscalationEngine] Failed to save risk history: ${err.message}`);
                });
            }
        }
        return updatedStates;
    }
    /**
     * Applies time-decay to risk scores when no new threats are observed
     */
    applyDecay(decayAmount = 10, inactiveMinutes = 10) {
        const now = Date.now();
        const thresholdMs = inactiveMinutes * 60 * 1000;
        const decayedStates = [];
        for (const [key, state] of this.entityScores.entries()) {
            if (state.currentScore > 0 && now - state.lastUpdatedAt >= thresholdMs) {
                const previousScore = state.currentScore;
                const newScore = Math.max(0, state.currentScore - decayAmount);
                const newLevel = this.getRiskLevel(newScore);
                const updated = {
                    ...state,
                    currentScore: newScore,
                    riskLevel: newLevel,
                    lastUpdatedAt: now,
                };
                this.entityScores.set(key, updated);
                decayedStates.push(updated);
                // Record decay in history
                database_1.prisma.riskHistory
                    .create({
                    data: {
                        entityType: state.entityType,
                        entityId: state.entityId,
                        previousScore,
                        newScore,
                        reason: `Risk score decayed after ${inactiveMinutes}m inactivity`,
                    },
                })
                    .catch((err) => {
                    logger_1.logger.warn(`[RiskEscalationEngine] Failed to record decay history: ${err.message}`);
                });
            }
        }
        return decayedStates;
    }
    /**
     * Gets the current risk state of an entity
     */
    getEntityRisk(entityType, entityId) {
        const key = this.getKey(entityType, entityId);
        return (this.entityScores.get(key) || {
            entityType: entityType,
            entityId,
            currentScore: 0,
            riskLevel: "LOW",
            lastUpdatedAt: Date.now(),
            contributingEventCount: 0,
        });
    }
    getAllStates() {
        return Array.from(this.entityScores.values());
    }
    resetScores() {
        this.entityScores.clear();
    }
}
exports.RiskEscalationEngine = RiskEscalationEngine;
exports.riskEscalationEngine = new RiskEscalationEngine();
