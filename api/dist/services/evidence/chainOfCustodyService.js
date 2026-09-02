"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainOfCustodyService = exports.ChainOfCustodyService = void 0;
const database_1 = require("@antipiracy/database");
const evidenceHashService_1 = require("./evidenceHashService");
const logger_1 = require("../logging/logger");
class ChainOfCustodyService {
    static GENESIS_CHAIN_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    /**
     * Appends an immutable cryptographic chain event to an EvidenceRecord's chain of custody
     */
    async appendChainEvent(params) {
        // Get the most recent chain event for this evidence
        const lastEvent = await database_1.prisma.evidenceChainEvent.findFirst({
            where: { evidenceRecordId: params.evidenceRecordId },
            orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        });
        const previousChainHash = lastEvent ? lastEvent.currentChainHash : ChainOfCustodyService.GENESIS_CHAIN_HASH;
        const timestamp = new Date();
        const eventDataString = params.eventData ? (typeof params.eventData === "string" ? params.eventData : JSON.stringify(params.eventData)) : "{}";
        const currentChainHash = evidenceHashService_1.evidenceHashService.computeChainBlockHash({
            previousChainHash,
            eventType: params.eventType,
            actorId: params.actorId,
            timestamp,
            eventData: eventDataString,
        });
        const chainEvent = await database_1.prisma.evidenceChainEvent.create({
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
        logger_1.logger.info(`[ChainOfCustody] Appended [${params.eventType}] for Evidence ${params.evidenceRecordId}. Hash: ${currentChainHash.substring(0, 12)}...`);
        return chainEvent;
    }
    /**
     * Validates the cryptographic continuity of an evidence record's chain of custody
     */
    async verifyChainOfCustody(evidenceRecordId) {
        const events = await database_1.prisma.evidenceChainEvent.findMany({
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
            const calculatedHash = evidenceHashService_1.evidenceHashService.computeChainBlockHash({
                previousChainHash: event.previousChainHash,
                eventType: event.eventType,
                actorId: event.actorId,
                timestamp: event.timestamp,
                eventData: event.eventData,
            });
            if (!evidenceHashService_1.evidenceHashService.verifyHash(calculatedHash, event.currentChainHash)) {
                logger_1.logger.error(`[ChainOfCustodyMismatch] Block ${i + 1} (${event.id}):
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
    async getChainHistory(evidenceRecordId) {
        return database_1.prisma.evidenceChainEvent.findMany({
            where: { evidenceRecordId },
            orderBy: [{ timestamp: "asc" }, { id: "asc" }],
        });
    }
}
exports.ChainOfCustodyService = ChainOfCustodyService;
exports.chainOfCustodyService = new ChainOfCustodyService();
