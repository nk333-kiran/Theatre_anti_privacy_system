import { prisma } from "@antipiracy/database";
import { logger } from "../logging/logger";
import { SanitizedRealtimeEvent } from "./realtimeEventBus";

export interface EntityRiskState {
  entityType: "THEATRE" | "SHOW" | "MOVIE" | "SESSION" | "OVERALL";
  entityId: string;
  currentScore: number; // 0 - 100
  riskLevel: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  lastUpdatedAt: number;
  contributingEventCount: number;
}

export class RiskEscalationEngine {
  private entityScores: Map<string, EntityRiskState> = new Map();

  public getRiskLevel(score: number): "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL" {
    if (score <= 19) return "LOW";
    if (score <= 39) return "GUARDED";
    if (score <= 59) return "ELEVATED";
    if (score <= 79) return "HIGH";
    return "CRITICAL";
  }

  private getKey(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  /**
   * Applies an incoming event to escalate risk score
   */
  public async escalateRisk(event: SanitizedRealtimeEvent): Promise<EntityRiskState[]> {
    const affectedEntities: { type: "THEATRE" | "SHOW" | "MOVIE" | "SESSION" | "OVERALL"; id: string }[] = [];

    affectedEntities.push({ type: "OVERALL", id: "GLOBAL" });
    if (event.theatreId) affectedEntities.push({ type: "THEATRE", id: event.theatreId });
    if (event.showId) affectedEntities.push({ type: "SHOW", id: event.showId });
    if (event.movieId) affectedEntities.push({ type: "MOVIE", id: event.movieId });
    if (event.playbackSessionId) affectedEntities.push({ type: "SESSION", id: event.playbackSessionId });

    let severityDelta = 5;
    if (event.severity === "MEDIUM") severityDelta = 15;
    if (event.severity === "HIGH") severityDelta = 30;
    if (event.severity === "CRITICAL") severityDelta = 50;

    const updatedStates: EntityRiskState[] = [];

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

      const newState: EntityRiskState = {
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
        prisma.riskHistory
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
            logger.warn(`[RiskEscalationEngine] Failed to save risk history: ${err.message}`);
          });
      }
    }

    return updatedStates;
  }

  /**
   * Applies time-decay to risk scores when no new threats are observed
   */
  public applyDecay(decayAmount: number = 10, inactiveMinutes: number = 10): EntityRiskState[] {
    const now = Date.now();
    const thresholdMs = inactiveMinutes * 60 * 1000;
    const decayedStates: EntityRiskState[] = [];

    for (const [key, state] of this.entityScores.entries()) {
      if (state.currentScore > 0 && now - state.lastUpdatedAt >= thresholdMs) {
        const previousScore = state.currentScore;
        const newScore = Math.max(0, state.currentScore - decayAmount);
        const newLevel = this.getRiskLevel(newScore);

        const updated: EntityRiskState = {
          ...state,
          currentScore: newScore,
          riskLevel: newLevel,
          lastUpdatedAt: now,
        };

        this.entityScores.set(key, updated);
        decayedStates.push(updated);

        // Record decay in history
        prisma.riskHistory
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
            logger.warn(`[RiskEscalationEngine] Failed to record decay history: ${err.message}`);
          });
      }
    }

    return decayedStates;
  }

  /**
   * Gets the current risk state of an entity
   */
  public getEntityRisk(entityType: string, entityId: string): EntityRiskState {
    const key = this.getKey(entityType, entityId);
    return (
      this.entityScores.get(key) || {
        entityType: entityType as any,
        entityId,
        currentScore: 0,
        riskLevel: "LOW",
        lastUpdatedAt: Date.now(),
        contributingEventCount: 0,
      }
    );
  }

  public getAllStates(): EntityRiskState[] {
    return Array.from(this.entityScores.values());
  }

  public resetScores() {
    this.entityScores.clear();
  }
}

export const riskEscalationEngine = new RiskEscalationEngine();
