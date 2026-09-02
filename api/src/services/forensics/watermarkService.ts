import crypto from "crypto";
import { prisma } from "@antipiracy/database";
import { logger } from "../logging/logger";

export interface ForensicWatermarkPayload {
  version: string;
  activationId: string;
  playbackSessionId: string;
  theatreCode: string;
  screenNumber: number;
  seatNumber: string;
  showId: string;
  movieId: string;
  timestamp: string;
  fingerprintHash: string;
}

export interface WatermarkLookupResult {
  found: boolean;
  watermarkPayload?: ForensicWatermarkPayload;
  theatre?: { id: string; name: string; code: string; location: string };
  screen?: { screenNumber: number; name: string };
  movie?: { id: string; title: string; durationMinutes: number };
  show?: { id: string; startTime: string; endTime: string; status: string };
  ticket?: { id: string; ticketNumber: string; seatNumber: string; status: string };
  activation?: { id: string; activationCode: string; status: string; activatedAt?: Date | null };
  playbackSession?: { id: string; sessionToken: string; status: string; authorizedAt: Date };
  drmLicense?: { id: string; licenseToken: string; status: string; issuedAt: Date };
  protectionEventsCount: number;
  suspiciousEventsCount: number;
}

class WatermarkService {
  private watermarkVersion = "1.3.0";

  /**
   * Generate a zero-PII forensic watermark payload and cryptographic fingerprint
   */
  public generateForensicPayload(params: {
    activationId: string;
    playbackSessionId: string;
    theatreCode: string;
    screenNumber: number;
    seatNumber: string;
    showId: string;
    movieId: string;
    timestamp?: string;
  }): ForensicWatermarkPayload {
    const timestamp = params.timestamp || new Date().toISOString();

    // Canonical representation of non-PII attributes
    const rawString = `${this.watermarkVersion}|${params.activationId}|${params.playbackSessionId}|${params.theatreCode}|${params.screenNumber}|${params.seatNumber}|${params.showId}|${params.movieId}|${timestamp}`;
    const fingerprintHash = crypto.createHash("sha256").update(rawString).digest("hex");

    return {
      version: this.watermarkVersion,
      activationId: params.activationId,
      playbackSessionId: params.playbackSessionId,
      theatreCode: params.theatreCode,
      screenNumber: params.screenNumber,
      seatNumber: params.seatNumber,
      showId: params.showId,
      movieId: params.movieId,
      timestamp,
      fingerprintHash,
    };
  }

  /**
   * Encodes the watermark into a compact, steganography-ready visual string
   * Example: "AGY-V13:TH01-SCR2-SEAT_A12-ACT9F82-PBT4A1B-T1724932800"
   */
  public formatVisualWatermark(payload: ForensicWatermarkPayload): string {
    const shortAct = payload.activationId.slice(0, 8);
    const shortPbt = payload.playbackSessionId.slice(0, 8);
    const epochSec = Math.floor(new Date(payload.timestamp).getTime() / 1000);

    return `AGY-V13:${payload.theatreCode}-S${payload.screenNumber}-${payload.seatNumber}-${shortAct}-${shortPbt}-T${epochSec}`;
  }

  /**
   * Trace an extracted watermark string or SHA-256 fingerprint back to the originating
   * screening, auditorium, seat, admission ticket, and device session.
   */
  public async lookupWatermark(query: string): Promise<WatermarkLookupResult> {
    const trimmed = query.trim();
    logger.info(`Performing forensic watermark trace lookup for query: ${trimmed.slice(0, 30)}...`);

    // 1. Direct search by PlaybackSession ID or token
    let session = await prisma.playbackSession.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { sessionToken: trimmed },
          { activationId: trimmed },
          { id: { startsWith: trimmed } },
          { sessionToken: { startsWith: trimmed } },
        ],
      },
      include: {
        theatre: true,
        show: {
          include: {
            movie: true,
            screen: true,
          },
        },
        activation: {
          include: {
            ticket: true,
          },
        },
        drmLicenses: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // 2. If not found directly, check ForensicEvidence records for matching fingerprint
    if (!session) {
      const evidence = await prisma.forensicEvidence.findFirst({
        where: {
          OR: [
            { watermarkFingerprint: trimmed },
            { evidenceHash: trimmed },
            { watermarkFingerprint: { contains: trimmed } },
          ],
        },
      });

      if (evidence?.playbackSessionId) {
        session = await prisma.playbackSession.findUnique({
          where: { id: evidence.playbackSessionId },
          include: {
            theatre: true,
            show: {
              include: {
                movie: true,
                screen: true,
              },
            },
            activation: {
              include: {
                ticket: true,
              },
            },
            drmLicenses: {
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        });
      }
    }

    if (!session) {
      return { found: false, protectionEventsCount: 0, suspiciousEventsCount: 0 };
    }

    const [protCount, threatCount] = await Promise.all([
      prisma.protectionEvent.count({ where: { activationId: session.activationId } }),
      prisma.securityAuditLog.count({
        where: {
          OR: [{ activationId: session.activationId }, { theatreId: session.theatreId }],
          isThreat: true,
        },
      }),
    ]);

    const payload = this.generateForensicPayload({
      activationId: session.activationId,
      playbackSessionId: session.id,
      theatreCode: session.theatre.code,
      screenNumber: session.show.screen.screenNumber,
      seatNumber: session.activation.ticket.seatNumber,
      showId: session.showId,
      movieId: session.show.movieId,
      timestamp: session.authorizedAt.toISOString(),
    });

    return {
      found: true,
      watermarkPayload: payload,
      theatre: {
        id: session.theatre.id,
        name: session.theatre.name,
        code: session.theatre.code,
        location: session.theatre.location,
      },
      screen: {
        screenNumber: session.show.screen.screenNumber,
        name: session.show.screen.name,
      },
      movie: {
        id: session.show.movie.id,
        title: session.show.movie.title,
        durationMinutes: session.show.movie.durationMinutes,
      },
      show: {
        id: session.show.id,
        startTime: session.show.startTime.toISOString(),
        endTime: session.show.endTime.toISOString(),
        status: session.show.status,
      },
      ticket: {
        id: session.activation.ticket.id,
        ticketNumber: session.activation.ticket.ticketNumber,
        seatNumber: session.activation.ticket.seatNumber,
        status: session.activation.ticket.status,
      },
      activation: {
        id: session.activation.id,
        activationCode: session.activation.activationCode,
        status: session.activation.status,
        activatedAt: session.activation.activatedAt,
      },
      playbackSession: {
        id: session.id,
        sessionToken: session.sessionToken,
        status: session.status,
        authorizedAt: session.authorizedAt,
      },
      drmLicense: session.drmLicenses[0]
        ? {
            id: session.drmLicenses[0].id,
            licenseToken: session.drmLicenses[0].licenseToken,
            status: session.drmLicenses[0].status,
            issuedAt: session.drmLicenses[0].issuedAt,
          }
        : undefined,
      protectionEventsCount: protCount,
      suspiciousEventsCount: threatCount,
    };
  }
}

export const watermarkService = new WatermarkService();
