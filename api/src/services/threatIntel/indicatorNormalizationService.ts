import { ThreatIntelIndicatorType } from "@prisma/client";

export interface NormalizedIndicator {
  type: ThreatIntelIndicatorType;
  canonicalValue: string;
  rawValue: string;
  isValid: boolean;
  validationError?: string;
}

export class IndicatorNormalizationService {
  /**
   * Main canonicalization entry point for all indicator types
   */
  public static normalize(type: ThreatIntelIndicatorType, rawValue: string): NormalizedIndicator {
    if (!rawValue || typeof rawValue !== "string" || !rawValue.trim()) {
      return {
        type,
        canonicalValue: "",
        rawValue: rawValue || "",
        isValid: false,
        validationError: "Indicator value cannot be empty",
      };
    }

    const trimmed = rawValue.trim();

    switch (type) {
      case ThreatIntelIndicatorType.IP_ADDRESS:
        return this.normalizeIpAddress(trimmed);
      case ThreatIntelIndicatorType.DOMAIN:
        return this.normalizeDomain(trimmed);
      case ThreatIntelIndicatorType.URL:
        return this.normalizeUrl(trimmed);
      case ThreatIntelIndicatorType.FILE_HASH:
        return this.normalizeFileHash(trimmed);
      case ThreatIntelIndicatorType.EMAIL:
        return this.normalizeEmail(trimmed);
      case ThreatIntelIndicatorType.USER_AGENT:
        return this.normalizeUserAgent(trimmed);
      case ThreatIntelIndicatorType.DEVICE_FINGERPRINT:
        return this.normalizeDeviceFingerprint(trimmed);
      case ThreatIntelIndicatorType.CONTENT_IDENTIFIER:
      case ThreatIntelIndicatorType.CAMPAIGN_IDENTIFIER:
      case ThreatIntelIndicatorType.CERTIFICATE:
      default:
        return {
          type,
          canonicalValue: trimmed,
          rawValue: trimmed,
          isValid: true,
        };
    }
  }

  /**
   * Normalizes IPv4 and IPv6 addresses.
   * Strips port numbers, CIDR notations where appropriate, and converts IPv4-mapped IPv6.
   */
  public static normalizeIpAddress(raw: string): NormalizedIndicator {
    let cleaned = raw.trim();

    // Strip bracket notation from IPv6 or port-attached IPv4 (e.g., "192.168.1.1:8080" or "[2001:db8::1]:443")
    if (cleaned.startsWith("[") && cleaned.includes("]")) {
      const closingIdx = cleaned.indexOf("]");
      cleaned = cleaned.substring(1, closingIdx);
    } else if (cleaned.includes(":") && !cleaned.includes("::") && (cleaned.match(/:/g) || []).length === 1) {
      // IPv4 with port (e.g. 192.0.2.1:8000)
      cleaned = cleaned.split(":")[0];
    }

    // Strip CIDR mask if present (e.g. /32 or /128)
    if (cleaned.includes("/")) {
      cleaned = cleaned.split("/")[0];
    }

    // IPv4 Regex Validation
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    if (ipv4Regex.test(cleaned)) {
      return {
        type: ThreatIntelIndicatorType.IP_ADDRESS,
        canonicalValue: cleaned,
        rawValue: raw,
        isValid: true,
      };
    }

    // IPv6 Basic Hex-Group Validation
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    if (ipv6Regex.test(cleaned)) {
      return {
        type: ThreatIntelIndicatorType.IP_ADDRESS,
        canonicalValue: cleaned.toLowerCase(),
        rawValue: raw,
        isValid: true,
      };
    }

    return {
      type: ThreatIntelIndicatorType.IP_ADDRESS,
      canonicalValue: cleaned,
      rawValue: raw,
      isValid: false,
      validationError: "Invalid IPv4 or IPv6 address format",
    };
  }

  /**
   * Normalizes domain names: lowercases, strips protocols and trailing slashes/dots, preserves subdomains.
   */
  public static normalizeDomain(raw: string): NormalizedIndicator {
    let domain = raw.trim().toLowerCase();

    // Strip http/https protocols if inadvertently passed
    if (domain.startsWith("http://")) domain = domain.substring(7);
    if (domain.startsWith("https://")) domain = domain.substring(8);

    // Strip path or port
    if (domain.includes("/")) domain = domain.split("/")[0];
    if (domain.includes(":") && !domain.includes("::")) domain = domain.split(":")[0];

    // Strip trailing dots
    while (domain.endsWith(".")) {
      domain = domain.slice(0, -1);
    }

    // Domain validation regex (RFC 1035 compliant domain check)
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
    if (!domainRegex.test(domain) && domain !== "localhost") {
      return {
        type: ThreatIntelIndicatorType.DOMAIN,
        canonicalValue: domain,
        rawValue: raw,
        isValid: false,
        validationError: "Invalid domain name syntax",
      };
    }

    return {
      type: ThreatIntelIndicatorType.DOMAIN,
      canonicalValue: domain,
      rawValue: raw,
      isValid: true,
    };
  }

  /**
   * Normalizes URLs without making external HTTP requests.
   */
  public static normalizeUrl(raw: string): NormalizedIndicator {
    let trimmed = raw.trim();

    try {
      const lower = trimmed.toLowerCase();
      if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
        trimmed = "https://" + trimmed;
      }
      const parsed = new URL(trimmed);
      parsed.host = parsed.host.toLowerCase();
      // Remove default ports
      if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
        parsed.port = "";
      }
      // Remove trailing slash on root pathname
      let result = parsed.toString();
      if (result.endsWith("/") && parsed.pathname === "/" && !parsed.search && !parsed.hash) {
        result = result.slice(0, -1);
      }

      return {
        type: ThreatIntelIndicatorType.URL,
        canonicalValue: result,
        rawValue: raw,
        isValid: true,
      };
    } catch {
      return {
        type: ThreatIntelIndicatorType.URL,
        canonicalValue: trimmed,
        rawValue: raw,
        isValid: false,
        validationError: "Malformed URL structure",
      };
    }
  }

  /**
   * Normalizes file hashes (MD5, SHA-1, SHA-256).
   */
  public static normalizeFileHash(raw: string): NormalizedIndicator {
    const cleaned = raw.trim().toLowerCase();
    const hexRegex = /^[0-9a-f]+$/;

    if (!hexRegex.test(cleaned)) {
      return {
        type: ThreatIntelIndicatorType.FILE_HASH,
        canonicalValue: cleaned,
        rawValue: raw,
        isValid: false,
        validationError: "Hash contains non-hexadecimal characters",
      };
    }

    const len = cleaned.length;
    if (len !== 32 && len !== 40 && len !== 64) {
      return {
        type: ThreatIntelIndicatorType.FILE_HASH,
        canonicalValue: cleaned,
        rawValue: raw,
        isValid: false,
        validationError: `Invalid hash length (${len}). Expected MD5 (32), SHA-1 (40), or SHA-256 (64).`,
      };
    }

    return {
      type: ThreatIntelIndicatorType.FILE_HASH,
      canonicalValue: cleaned,
      rawValue: raw,
      isValid: true,
    };
  }

  /**
   * Normalizes email addresses (lowercased, whitespace stripped).
   */
  public static normalizeEmail(raw: string): NormalizedIndicator {
    const cleaned = raw.trim().toLowerCase();
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    if (!emailRegex.test(cleaned)) {
      return {
        type: ThreatIntelIndicatorType.EMAIL,
        canonicalValue: cleaned,
        rawValue: raw,
        isValid: false,
        validationError: "Invalid email address format",
      };
    }

    return {
      type: ThreatIntelIndicatorType.EMAIL,
      canonicalValue: cleaned,
      rawValue: raw,
      isValid: true,
    };
  }

  /**
   * Normalizes User Agents (collapses whitespace, preserves tokens).
   */
  public static normalizeUserAgent(raw: string): NormalizedIndicator {
    const cleaned = raw.trim().replace(/\s+/g, " ");
    return {
      type: ThreatIntelIndicatorType.USER_AGENT,
      canonicalValue: cleaned,
      rawValue: raw,
      isValid: cleaned.length > 0,
    };
  }

  /**
   * Normalizes device fingerprints (lowercased hex/base64 tokens).
   */
  public static normalizeDeviceFingerprint(raw: string): NormalizedIndicator {
    const cleaned = raw.trim().toLowerCase();
    return {
      type: ThreatIntelIndicatorType.DEVICE_FINGERPRINT,
      canonicalValue: cleaned,
      rawValue: raw,
      isValid: cleaned.length >= 8,
      validationError: cleaned.length < 8 ? "Device fingerprint token must be at least 8 characters" : undefined,
    };
  }
}
