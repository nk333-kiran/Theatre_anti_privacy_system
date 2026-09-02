"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdnFailoverService = exports.CdnFailoverService = void 0;
const cdnService_1 = require("./cdnService");
const logger_1 = require("../logging/logger");
class CdnFailoverService {
    endpoints = [
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
    getActiveEndpoint() {
        const healthy = this.endpoints
            .filter((ep) => ep.isHealthy)
            .sort((a, b) => a.priority - b.priority);
        return healthy[0] || this.endpoints[0];
    }
    setEndpointHealth(id, isHealthy) {
        const ep = this.endpoints.find((e) => e.id === id);
        if (ep) {
            ep.isHealthy = isHealthy;
            logger_1.logger.warn(`[CdnFailover] Set CDN ${id} health to ${isHealthy ? "HEALTHY" : "UNHEALTHY"}`);
        }
    }
    getAllEndpoints() {
        return [...this.endpoints];
    }
    generateResilientPlaybackUrl(params) {
        const activeEp = this.getActiveEndpoint();
        const primaryUrl = cdnService_1.cdnService.generateSignedPlaybackUrl(params);
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
exports.CdnFailoverService = CdnFailoverService;
exports.cdnFailoverService = new CdnFailoverService();
