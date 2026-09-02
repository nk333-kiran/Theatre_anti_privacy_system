import { Response, NextFunction } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { prisma } from "@antipiracy/database";

export interface Phase2DashboardStats {
  totalTheatres: number;
  totalScreens: number;
  totalMovies: number;
  upcomingShows: number;
  ticketsIssued: number;
  activeVerifications: number;
}

export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response<ApiResponse<Phase2DashboardStats>>,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();

    const [
      theatresCount,
      screensCount,
      moviesCount,
      upcomingShowsCount,
      ticketsCount,
      activationsCount,
    ] = await Promise.all([
      prisma.theatre.count(),
      prisma.screen.count(),
      prisma.movie.count(),
      prisma.show.count({
        where: {
          status: { in: ["SCHEDULED", "ACTIVE"] },
          endTime: { gte: now },
        },
      }),
      prisma.ticket.count(),
      prisma.activation.count({ where: { status: "ACTIVE" } }),
    ]);

    const stats: Phase2DashboardStats = {
      totalTheatres: theatresCount,
      totalScreens: screensCount,
      totalMovies: moviesCount,
      upcomingShows: upcomingShowsCount,
      ticketsIssued: ticketsCount,
      activeVerifications: activationsCount,
    };

    res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully from PostgreSQL",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentOverview = async (
  _req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const [dbShows, dbTheatres] = await Promise.all([
      prisma.show.findMany({
        take: 6,
        orderBy: { startTime: "desc" },
        include: {
          movie: true,
          theatre: true,
          screen: true,
          _count: { select: { tickets: true } },
        },
      }),
      prisma.theatre.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { screens: true, shows: true } },
        },
      }),
    ]);

    const shows = dbShows.map((s) => ({
      id: s.id,
      movie: s.movie.title,
      theatre: s.theatre.name,
      screen: s.screen.name,
      time: `${new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date(s.startTime).toLocaleDateString(),
      ticketsSold: s._count.tickets,
      status: s.status,
    }));

    const theatres = dbTheatres.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      location: t.location,
      screensCount: t._count.screens,
      showsCount: t._count.shows,
      status: "ONLINE",
    }));

    res.status(200).json({
      success: true,
      data: {
        shows,
        theatres,
      },
    });
  } catch (error) {
    next(error);
  }
};
