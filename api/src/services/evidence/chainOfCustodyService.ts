import { prisma } from "@antipiracy/database";
import { evidenceHashService } from "./evidenceHashService";
import { logger } from "../logging/logger";

export interface AppendChainEventParams {
  evidenceRecordId: string;
  eventType: string; // "ACQUISITION" | "INTEGRITY_CHECK" | "ANALYST_ACCESS" | "LEGAL_HOLD_APPLIED" | "STATUS_CHANGE" | "EXPORT"
  actorId?: string;
  actorRole?: string;
  actorEmail?: string;
  eventData?: any;
}

export class ChainOfCustodyService {
  public static readonly GENESIS_CHAIN_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  /**
   * Appends an immutable cryptographic chain event to an EvidenceRecord's chain of custody
   */
  public async appendChainEvent(params: AppendChainEventParams) {
    // Get the most recent chain event for this evidence
    const lastEvent = await prisma.evidenceChainEvent.findFirst({
      where: { evidenceRecordId: params.evidenceRecordId },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    });

    const previousChainHash = lastEvent ? lastEvent.currentChainHash : ChainOfCustodyService.GENESIS_CHAIN_HASH;
    const timestamp = new Date();
    const eventDataString = params.eventData ? (typeof params.eventData === "string" ? params.eventData : JSON.stringify(params.eventData)) : "{}";

    const currentChainHash = evidenceHashService.computeChainBlockHash({
      previousChainHash,
      eventType: params.eventType,
      actorId: params.actorId,
      timestamp,
      eventData: eventDataString,
    });

    const chainEvent = await prisma.evidenceChainEvent.create({
      data: {
        evidenceRecordId: params.evidenceRecordId,
        eventType: params.eventType,
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorEmail: params.actorEmail,
        previousChainHash,
        currentChainHash,
        eventData: eventDataString,
        timestamp,
      },
    });

    logger.info(
      `[ChainOfCustody] Appended [${params.eventType}] for Evidence ${params.evidenceRecordId}. Hash: ${currentChainHash.substring(0, 12)}...`
    );

    return chainEvent;
  }

  /**
   * Validates the cryptographic continuity of an evidence record's chain of custody
   */
  public async verifyChainOfCustody(evidenceRecordId: string): Promise<{
    isValid: boolean;
    totalEvents: number;
    tamperedAtEventId?: string;
    details?: string;
  }> {
    const events = await prisma.evidenceChainEvent.findMany({
      where: { evidenceRecordId },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    });

    if (events.length === 0) {
      return { isValid: true, totalEvents: 0 };
    }

    let expectedPrevHash = ChainOfCustodyService.GENESIS_CHAIN_HASH;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Check previous hash linkage
      if (event.previousChainHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalEvents: events.length,
          tamperedAtEventId: event.id,
          details: `Broken previous hash link at block ${i + 1} (${event.id}). Expected ${expectedPrevHash.substring(0, 12)}, found ${event.previousChainHash.substring(0, 12)}`,
        };
      }

      // Recompute expected current hash
      const calculatedHash = evidenceHashService.computeChainBlockHash({
        previousChainHash: event.previousChainHash,
        eventType: event.eventType,
        actorId: event.actorId,
        timestamp: event.timestamp,
        eventData: event.eventData,
      });

      if (!evidenceHashService.verifyHash(calculatedHash, event.currentChainHash)) {
        logger.error(`[ChainOfCustodyMismatch] Block ${i + 1} (${event.id}):
Stored Hash: ${event.currentChainHash}
Calculated:  ${calculatedHash}
Stored Raw Event:
  prevHash:  ${event.previousChainHash}
  eventType: ${event.eventType}
  actorId:   ${event.actorId}
  timestamp: ${event.timestamp.toISOString()}
  eventData: ${event.eventData}
Calculated Input Payload:
  ${[event.previousChainHash, event.eventType, event.actorId || "SYSTEM", event.timestamp.toISOString(), event.eventData || "{}"].join("::")}`);

        return {
          isValid: false,
          totalEvents: events.length,
          tamperedAtEventId: event.id,
          details: `Current block hash mismatch at block ${i + 1} (${event.id}). Stored: ${event.currentChainHash.substring(0, 12)}, Calculated: ${calculatedHash.substring(0, 12)}`,
        };
      }

      expectedPrevHash = event.currentChainHash;
    }

    return { isValid: true, totalEvents: events.length };
  }

  /**
   * Retrieves full chronological chain of custody history
   */
  public async getChainHistory(evidenceRecordId: string) {
    return prisma.evidenceChainEvent.findMany({
      where: { evidenceRecordId },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
    });
  }
}

export const chainOfCustodyService = new ChainOfCustodyService();
