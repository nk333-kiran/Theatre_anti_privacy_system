"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternDetectionEngine = exports.PatternDetectionEngine = void 0;
const database_1 = require("@antipiracy/database");
class PatternDetectionEngine {
    /**
     * Scans aggregated signals to recognize specific threat attack vectors
     */
    detectPatterns(signals, context) {
        const patterns = [];
        // Pattern 1: DRM Abuse
        const drmDenialSignals = signals.filter((s) => s.eventType === "DRM_KEY_DENIED");
        if (drmDenialSignals.length > 0) {
            patterns.push({
                patternType: "DRM_ABUSE",
                name: "Repeated DRM License Abuse",
                description: "Multiple unauthorized DRM license acquisition requests detected for protected content.",
                severity: "HIGH",
                confidence: 90,
                theatreId: context?.theatreId,
                showId: context?.showId,
                movieId: context?.movieId,
                evidence: { signals: drmDenialSignals },
                signals: drmDenialSignals,
            });
        }
        // Pattern 2: Playback Abuse & Session Hijack
        const sessionRevocationSignals = signals.filter((s) => s.eventType === "SESSION_REVOKED");
        if (sessionRevocationSignals.length > 0) {
            patterns.push({
                patternType: "PLAYBACK_ABUSE",
                name: "Abnormal Playback Session Termination",
                description: "Active video streaming session terminated following anomalous client telemetry.",
                severity: "HIGH",
                confidence: 95,
                theatreId: context?.theatreId,
                showId: context?.showId,
                movieId: context?.movieId,
                evidence: { signals: sessionRevocationSignals },
                signals: sessionRevocationSignals,
            });
        }
        // Pattern 3: Forensic Watermark Leak
        const watermarkSignals = signals.filter((s) => s.eventType === "WATERMARK_IDENTIFIED");
        if (watermarkSignals.length > 0) {
            patterns.push({
                patternType: "FORENSIC_LEAK",
                name: "Attributed Forensic Watermark Match",
                description: "Forensic watermark decoder matched leaked video buffer to physical theatre seating.",
                severity: "CRITICAL",
                confidence: 95,
                theatreId: context?.theatreId,
                showId: context?.showId,
                movieId: context?.movieId,
                evidence: { signals: watermarkSignals },
                signals: watermarkSignals,
            });
        }
        // Pattern 4: Checkpoint / Ticket Abuse
        const admissionDeniedSignals = signals.filter((s) => s.eventType === "ADMISSION_DENIED");
        if (admissionDeniedSignals.length > 0) {
            patterns.push({
                patternType: "CHECKPOINT_ABUSE",
                name: "Repeated Checkpoint Verification Failures",
                description: "Patron tickets scanned repeatedly with invalid or expired activation tokens.",
                severity: "MEDIUM",
                confidence: 85,
                theatreId: context?.theatreId,
                showId: context?.showId,
                movieId: context?.movieId,
                evidence: { signals: admissionDeniedSignals },
                signals: admissionDeniedSignals,
            });
        }
        // Pattern 5: Coordinated Multi-Session Activity
        if (signals.length >= 3) {
            patterns.push({
                patternType: "COORDINATED_MULTI_SESSION",
                name: "Coordinated Multi-Vector Threat Pattern",
                description: "Simultaneous anomalous signals across authentication, checkpoints, and DRM layers.",
                severity: "CRITICAL",
                confidence: 92,
                theatreId: context?.theatreId,
                showId: context?.showId,
                movieId: context?.movieId,
                evidence: { totalSignals: signals.length, summary: signals.map((s) => s.description) },
                signals,
            });
        }
        return patterns;
    }
    /**
     * Persists or updates detected patterns in database
     */
    async persistPatterns(patterns) {
        const saved = [];
        for (const pat of patterns) {
            // Find existing pattern by type and context
            const existing = await database_1.prisma.threatPattern.findFirst({
                where: {
                    patternType: pat.patternType,
                    theatreId: pat.theatreId || undefined,
                    showId: pat.showId || undefined,
                    status: "DETECTED",
                },
            });
            if (existing) {
                const updated = await database_1.prisma.threatPattern.update({
                    where: { id: existing.id },
                    data: {
                        occurrenceCount: { increment: 1 },
                        lastDetectedAt: new Date(),
                        confidence: Math.max(existing.confidence, pat.confidence),
                        evidence: JSON.stringify(pat.evidence),
                    },
                });
                saved.push(updated);
            }
            else {
                const created = await database_1.prisma.threatPattern.create({
                    data: {
                        patternType: pat.patternType,
                        name: pat.name,
                        description: pat.description,
                        severity: pat.severity,
                        confidence: pat.confidence,
                        theatreId: pat.theatreId,
                        showId: pat.showId,
                        movieId: pat.movieId,
                        evidence: JSON.stringify(pat.evidence),
                        signals: {
                            create: pat.signals.map((sig) => ({
                                signalType: sig.eventType,
                                signalValue: sig.description,
                                eventType: sig.eventType,
                                source: sig.source,
                                weight: sig.weight,
                                riskWeight: sig.weight,
                                confidence: sig.confidence,
                            })),
                        },
                    },
                });
                saved.push(created);
            }
        }
        return saved;
    }
}
exports.PatternDetectionEngine = PatternDetectionEngine;
exports.patternDetectionEngine = new PatternDetectionEngine();
