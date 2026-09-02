import { prisma } from "@antipiracy/database";
import { ThreatIntelCampaignStatus } from "@prisma/client";

export interface CreateCampaignParams {
  campaignIdentifier?: string;
  name: string;
  description?: string;
  threatClassification: string;
  riskLevel?: string;
  confidence?: number;
  theatreId?: string;
  movieId?: string;
  productionCompanyId?: string;
  investigationCaseId?: string;
  evidenceRecordId?: string;
  indicatorIds?: string[];
}

export class PiracyCampaignService {
  /**
   * Generates a unique campaign identifier: CMP-YYYY-XXXX
   */
  public static generateCampaignIdentifier(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CMP-${year}-${randomHex}`;
  }

  /**
   * Creates a new Piracy Campaign Dossier.
   */
  public static async createCampaign(params: CreateCampaignParams) {
    const identifier = params.campaignIdentifier?.trim() || this.generateCampaignIdentifier();

    const indicatorConnect = params.indicatorIds && params.indicatorIds.length
      ? { connect: params.indicatorIds.map((id) => ({ id })) }
      : undefined;

    return await prisma.threatIntelCampaign.create({
      data: {
        campaignIdentifier: identifier,
        name: params.name.trim(),
        description: params.description,
        threatClassification: params.threatClassification.trim(),
        riskLevel: params.riskLevel || "HIGH",
        confidence: Math.max(0, Math.min(100, params.confidence ?? 75)),
        status: ThreatIntelCampaignStatus.OBSERVED,
        theatreId: params.theatreId,
        movieId: params.movieId,
        productionCompanyId: params.productionCompanyId,
        investigationCaseId: params.investigationCaseId,
        evidenceRecordId: params.evidenceRecordId,
        indicators: indicatorConnect,
      },
      include: {
        indicators: true,
        theatre: true,
        movie: true,
        productionCompany: true,
      },
    });
  }

  /**
   * Updates an existing campaign's status and metadata.
   */
  public static async updateCampaignStatus(
    campaignId: string,
    status: ThreatIntelCampaignStatus,
    notes?: string
  ) {
    return await prisma.threatIntelCampaign.update({
      where: { id: campaignId },
      data: {
        status,
        lastObservedAt: new Date(),
      },
      include: {
        indicators: true,
        investigationCase: true,
        evidenceRecord: true,
      },
    });
  }

  /**
   * Links indicators to a campaign.
   */
  public static async linkIndicators(campaignId: string, indicatorIds: string[]) {
    return await prisma.threatIntelCampaign.update({
      where: { id: campaignId },
      data: {
        indicators: {
          connect: indicatorIds.map((id) => ({ id })),
        },
      },
      include: {
        indicators: true,
      },
    });
  }

  /**
   * Lists campaigns with optional tenant filters.
   */
  public static async listCampaigns(options?: {
    theatreId?: string;
    movieId?: string;
    productionCompanyId?: string;
    status?: ThreatIntelCampaignStatus;
  }) {
    const where: any = {};
    if (options?.theatreId) where.theatreId = options.theatreId;
    if (options?.movieId) where.movieId = options.movieId;
    if (options?.productionCompanyId) where.productionCompanyId = options.productionCompanyId;
    if (options?.status) where.status = options.status;

    return await prisma.threatIntelCampaign.findMany({
      where,
      orderBy: { lastObservedAt: "desc" },
      include: {
        theatre: true,
        movie: true,
        productionCompany: true,
        investigationCase: true,
        evidenceRecord: true,
        _count: {
          select: {
            indicators: true,
            matches: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves a single campaign with all relationships.
   */
  public static async getCampaignById(id: string) {
    return await prisma.threatIntelCampaign.findUnique({
      where: { id },
      include: {
        indicators: {
          include: { source: true },
        },
        matches: {
          include: { playbackSession: true, theatre: true, movie: true },
        },
        theatre: true,
        movie: true,
        productionCompany: true,
        investigationCase: {
          include: { notes: true },
        },
        evidenceRecord: {
          include: { artifacts: true },
        },
      },
    });
  }
}
