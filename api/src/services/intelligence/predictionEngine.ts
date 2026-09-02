import { prisma } from "@antipiracy/database";
import { logger } from "../logging/logger";

export interface PredictionResult {
  theatreId?: string;
  theatreName?: string;
  showId?: string;
  showTime?: string;
  movieId?: string;
  movieTitle?: string;
  predictionType: "UPCOMING_SCREENING_RISK" | "THEATRE_RISK" | "MOVIE_RISK" | "DRM_ABUSE_PROBABILITY";
  predictedRisk: number; // 0 - 100
  confidence: number; // 0 - 100
  explanation: string;
  recommendedAction: string;
  predictionWindow: string;
}

export class PredictionEngine {
  /**
   * Generates predictive risk assessments for upcoming screenings and venues
   */
  public async generatePredictions(): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];

    // 1. Forecast for Upcoming Screenings (Next 24h)
    const upcomingShows = await prisma.show.findMany({
      where: {
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        theatre: true,
        movie: true,
      },
      take: 20,
    });

    for (const show of upcomingShows) {
      // Historical threat count at this theatre
      const pastThreatCount = await prisma.securityAuditLog.count({
        where: {
          theatreId: show.theatreId,
          isThreat: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      // Historical DRM revocations on this movie
      const movieRevocations = await prisma.drmLicense.count({
        where: {
          show: { movieId: show.movieId },
          status: "REVOKED",
        },
      });

      let calculatedRisk = 15; // baseline low
      const reasons: string[] = [];

      if (pastThreatCount > 5) {
        calculatedRisk += Math.min(40, pastThreatCount * 4);
        reasons.push(`Venue ${show.theatre.name} recorded ${pastThreatCount} threat events in past 7 days`);
      }

      if (movieRevocations > 2) {
        calculatedRisk += Math.min(35, movieRevocations * 5);
        reasons.push(`Movie "${show.movie.title}" has ${movieRevocations} historical DRM key revocations`);
      }

      const finalRisk = Math.min(95, calculatedRisk);
      const confidence = Math.min(90, 60 + (pastThreatCount > 0 ? 15 : 0) + (movieRevocations > 0 ? 15 : 0));

      let recommendation = "Maintain standard screening posture.";
      if (finalRisk >= 60) {
        recommendation = "Deploy additional security staff verification checkpoint and monitor live playback telemetry.";
      } else if (finalRisk >= 40) {
        recommendation = "Enable high-frequency watermark heartbeat polling.";
      }

      predictions.push({
        theatreId: show.theatreId,
        theatreName: show.theatre.name,
        showId: show.id,
        showTime: show.startTime.toISOString(),
        movieId: show.movieId,
        movieTitle: show.movie.title,
        predictionType: "UPCOMING_SCREENING_RISK",
        predictedRisk: finalRisk,
        confidence,
        explanation: reasons.length > 0 ? reasons.join("; ") : "Historical venue and content telemetry shows nominal risk profile.",
        recommendedAction: recommendation,
        predictionWindow: "NEXT_24_HOURS",
      });
    }

    return predictions;
  }

  /**
   * Persists predictions to database
   */
  public async persistPredictions(predictions: PredictionResult[]) {
    const records = [];
    for (const pred of predictions) {
      const record = await prisma.threatPrediction.create({
        data: {
          theatreId: pred.theatreId,
          showId: pred.showId,
          movieId: pred.movieId,
          predictionType: pred.predictionType,
          predictedRisk: pred.predictedRisk,
          confidence: pred.confidence,
          explanation: pred.explanation,
          recommendedAction: pred.recommendedAction,
          predictionWindow: pred.predictionWindow,
        },
      });
      records.push(record);
    }
    return records;
  }
}

export const predictionEngine = new PredictionEngine();
