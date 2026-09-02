import crypto from "crypto";

export class EvidenceHashService {
  /**
   * Computes SHA-256 hash over raw data buffer or string
   */
  public computeSha256(data: string | Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Computes a deterministic canonical SHA-256 hash over an evidence record and its metadata
   */
  public computeEvidenceRecordHash(params: {
    evidenceNumber: string;
    classification: string;
    source: string;
    metadata?: string | null;
    theatreId?: string | null;
    movieId?: string | null;
    showId?: string | null;
    createdAt: string | Date;
  }): string {
    const canonicalPayload = JSON.stringify({
      evidenceNumber: params.evidenceNumber,
      classification: params.classification,
      source: params.source,
      metadata: params.metadata || "{}",
      theatreId: params.theatreId || null,
      movieId: params.movieId || null,
      showId: params.showId || null,
      createdAt: new Date(params.createdAt).toISOString(),
    });

    return this.computeSha256(canonicalPayload);
  }

  /**
   * Computes a cryptographic chain block hash:
   * H_n = SHA256(H_{n-1} + eventType + actorId + timestamp + eventData)
   */
  public computeChainBlockHash(params: {
    previousChainHash: string;
    eventType: string;
    actorId?: string | null;
    timestamp: string | Date;
    eventData?: string | null;
  }): string {
    const payload = [
      params.previousChainHash,
      params.eventType,
      params.actorId || "SYSTEM",
      new Date(params.timestamp).toISOString(),
      params.eventData || "{}",
    ].join("::");

    return this.computeSha256(payload);
  }

  /**
   * Verifies if a given hash matches the expected hash
   */
  public verifyHash(calculated: string, expected: string): boolean {
    if (!calculated || !expected || calculated.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(calculated, "utf-8"), Buffer.from(expected, "utf-8"));
  }
}

export const evidenceHashService = new EvidenceHashService();
