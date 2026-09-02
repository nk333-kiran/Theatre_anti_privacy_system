"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentOverview = exports.getDashboardStats = void 0;
const database_1 = require("@antipiracy/database");
const getDashboardStats = async (_req, res, next) => {
    try {
        const now = new Date();
        const [theatresCount, screensCount, moviesCount, upcomingShowsCount, ticketsCount, activationsCount,] = await Promise.all([
            database_1.prisma.theatre.count(),
            database_1.prisma.screen.count(),
            database_1.prisma.movie.count(),
            database_1.prisma.show.count({
                where: {
                    status: { in: ["SCHEDULED", "ACTIVE"] },
                    endTime: { gte: now },
                },
            }),
            database_1.prisma.ticket.count(),
            database_1.prisma.activation.count({ where: { status: "ACTIVE" } }),
        ]);
        const stats = {
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
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
const getRecentOverview = async (_req, res, next) => {
    try {
        const [dbShows, dbTheatres] = await Promise.all([
            database_1.prisma.show.findMany({
                take: 6,
                orderBy: { startTime: "desc" },
                include: {
                    movie: true,
                    theatre: true,
                    screen: true,
                    _count: { select: { tickets: true } },
                },
            }),
            database_1.prisma.theatre.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getRecentOverview = getRecentOverview;
