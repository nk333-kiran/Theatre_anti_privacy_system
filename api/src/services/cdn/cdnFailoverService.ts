import crypto from "crypto";
import { cdnService } from "./cdnService";
import { logger } from "../logging/logger";

export interface CdnEndpoint {
  id: string;
  name: string;
  baseUrl: string;
  isHealthy: boolean;
  priority: number; // 1 = primary, 2 = secondary
}

export class CdnFailoverService {
  private endpoints: CdnEndpoint[] = [
    {
      id: "cdn-primary-cloudflare",
      name: "Cloudflare Enterprise CDN",
      baseUrl: process.env.CDN_BASE_URL || "https://media-cdn.theatre-antipiracy.net",
      isHealthy: true,
      priority: 1,
    },
    {
      id: "cdn-secondary-fastly",
      name: "Fastly Media Shield (Fallback)",
      baseUrl: process.env.CDN_FALLBACK_BASE_URL || "https://media-fallback-cdn.theatre-antipiracy.net",
      isHealthy: true,
      priority: 2,
    },
  ];

  public getActiveEndpoint(): CdnEndpoint {
    const healthy = this.endpoints
      .filter((ep) => ep.isHealthy)
      .sort((a, b) => a.priority - b.priority);

    return healthy[0] || this.endpoints[0];
  }

  public setEndpointHealth(id: string, isHealthy: boolean): void {
    const ep = this.endpoints.find((e) => e.id === id);
    if (ep) {
      ep.isHealthy = isHealthy;
      logger.warn(`[CdnFailover] Set CDN ${id} health to ${isHealthy ? "HEALTHY" : "UNHEALTHY"}`);
    }
  }

  public getAllEndpoints(): CdnEndpoint[] {
    return [...this.endpoints];
  }

  public generateResilientPlaybackUrl(params: {
    assetPath: string;
    sessionId: string;
    clientIp?: string;
    ttlSeconds?: number;
  }): { primaryUrl: string; fallbackUrl: string; activeEndpoint: string } {
    const activeEp = this.getActiveEndpoint();
    const primaryUrl = cdnService.generateSignedPlaybackUrl(params);

    // Fallback URL with secondary CDN host
    const secondaryEp = this.endpoints.find((e) => e.id !== activeEp.id) || this.endpoints[1];
    const fallbackUrl = primaryUrl.replace(activeEp.baseUrl, secondaryEp.baseUrl);

    return {
      primaryUrl,
      fallbackUrl,
      activeEndpoint: activeEp.name,
    };
  }
}

export const cdnFailoverService = new CdnFailoverService();
