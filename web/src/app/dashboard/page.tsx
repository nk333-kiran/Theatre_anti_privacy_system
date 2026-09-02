"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Tv,
  Film,
  CalendarCheck,
  Ticket,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
  Plus,
  QrCode,
} from "lucide-react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { StatCard } from "../../components/StatCard";
import { DataTable, Column } from "../../components/DataTable";
import { TheatreManagement } from "../../components/theatres/TheatreManagement";
import { MovieManagement } from "../../components/movies/MovieManagement";
import { ShowManagement } from "../../components/shows/ShowManagement";
import { TicketManagement } from "../../components/tickets/TicketManagement";
import { SecurityStaffVerification } from "../../components/security/SecurityStaffVerification";
import { ProtectionMonitoring } from "../../components/protection/ProtectionMonitoring";
import { ProductionDashboard } from "../../components/production/ProductionDashboard";
import { ProductionCompanyManagement } from "../../components/production/ProductionCompanyManagement";
import { DrmMonitoringDashboard } from "../../components/drm/DrmMonitoringDashboard";
import { SecurityOperationsDashboard } from "../../components/security/SecurityOperationsDashboard";
import { ProductionOperationsDashboard } from "../../components/operations/ProductionOperationsDashboard";
import { ForensicInvestigationCenter } from "../../components/investigation/ForensicInvestigationCenter";
import { AntiPiracyCommandCenter } from "../../components/security/AntiPiracyCommandCenter";
import { TrafficEngineeringDashboard } from "../../components/operations/TrafficEngineeringDashboard";
import { ThreatIntelligenceCenter } from "../../components/intelligence/ThreatIntelligenceCenter";
import { ThreatIntelligenceDashboard } from "../../components/intelligence/ThreatIntelligenceDashboard";
import { RealtimeThreatTimeline } from "../../components/realtime/RealtimeThreatTimeline";
import { ThreatRiskHeatmap } from "../../components/realtime/ThreatRiskHeatmap";
import { RealtimeIncidentCenter } from "../../components/realtime/RealtimeIncidentCenter";
import EvidenceVault from "../../components/evidence/EvidenceVault";
import ComplianceOperationsDashboard from "../../components/evidence/ComplianceOperationsDashboard";
import ExternalThreatIntelligenceDashboard from "../../components/intelligence/ExternalThreatIntelligenceDashboard";
import EnterpriseGovernanceDashboard from "../../components/governance/EnterpriseGovernanceDashboard";
import { UnifiedSecurityOperationsCenter } from "../../components/soc/UnifiedSecurityOperationsCenter";
import { EnforcementCenter } from "../../components/enforcement/EnforcementCenter";
import { StudioIntelligenceDashboard } from "../../components/intelligence/StudioIntelligenceDashboard";
import { EndToEndResponsePanel } from "../../components/orchestration/EndToEndResponsePanel";
import { EndToEndDemoPanel } from "../../components/orchestration/EndToEndDemoPanel";
import { DisasterRecoveryDashboard } from "../../components/recovery/DisasterRecoveryDashboard";
import EnterpriseProductionOpsDashboard from "../../components/production/ProductionOperationsDashboard";
import {
  UserProfile,
  DashboardStats,
  TheatreItem,
  MovieItem,
  ShowItem,
  TicketItem,
  ProductionCompanyItem,
  RealtimeThreatEventItem,
  RealtimeIncidentNotificationItem,
  fetchRealtimeEvents,
  fetchRealtimeIncidents,
  fetchDashboardStats,
  fetchTheatres,
  fetchMovies,
  fetchShows,
  fetchTickets,
  fetchProductionCompanies,
} from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<UserProfile | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalTheatres: 0,
    totalScreens: 0,
    totalMovies: 0,
    upcomingShows: 0,
    ticketsIssued: 0,
    activeVerifications: 0,
  });

  const [theatres, setTheatres] = useState<TheatreItem[]>([]);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [shows, setShows] = useState<ShowItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [companies, setCompanies] = useState<ProductionCompanyItem[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeThreatEventItem[]>([]);
  const [realtimeIncidents, setRealtimeIncidents] = useState<RealtimeIncidentNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = async (token?: string) => {
    setLoading(true);
    try {
      const [
        statsData,
        theatresData,
        moviesData,
        showsData,
        ticketsData,
        companiesData,
        eventsData,
        incidentsData,
      ] = await Promise.all([
        fetchDashboardStats(token),
        fetchTheatres(token).catch(() => []),
        fetchMovies(token).catch(() => []),
        fetchShows(undefined, token).catch(() => []),
        fetchTickets(undefined, token).catch(() => []),
        fetchProductionCompanies(undefined, token).catch(() => []),
        fetchRealtimeEvents(undefined, token).catch(() => []),
        fetchRealtimeIncidents(token).catch(() => []),
      ]);

      setStats(statsData);
      setTheatres(theatresData);
      setMovies(moviesData);
      setShows(showsData);
      setTickets(ticketsData);
      setCompanies(companiesData);
      setRealtimeEvents(eventsData);
      setRealtimeIncidents(incidentsData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (userJson) {
      try {
        const parsed = JSON.parse(userJson);
        setUser(parsed);
        if (parsed.role === "THEATRE_STAFF") {
          setActiveTab("verifications");
        } else if (parsed.role === "PRODUCTION_COMPANY") {
          setActiveTab("production");
        }
      } catch (e) {
        // ignore
      }
    }

    loadAllData(token);
  }, [router]);

  // Columns for Overview Recent Shows table
  const showOverviewColumns: Column<ShowItem>[] = [
    {
      header: "Movie Title",
      accessor: (item) => (
        <div>
          <div className="font-semibold text-slate-100">{item.movie.title}</div>
          <div className="text-xs text-slate-400 font-mono">{item.movie.durationMinutes}m &bull; {item.movie.language}</div>
        </div>
      ),
    },
    {
      header: "Theatre & Screen",
      accessor: (item) => (
        <div>
          <div className="text-slate-200">{item.theatre.name}</div>
          <div className="text-xs text-indigo-400 font-mono">{item.screen.name}</div>
        </div>
      ),
    },
    {
      header: "Time Slot",
      accessor: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
          {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item) => {
        const isLive = item.status === "ACTIVE";
        const isCancelled = item.status === "CANCELLED";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isCancelled
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : isLive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCancelled ? "bg-rose-400" : isLive ? "bg-emerald-400 animate-pulse" : "bg-indigo-400"
              }`}
            />
            {item.status}
          </span>
        );
      },
    },
  ];

  // Columns for Overview Tickets table
  const ticketOverviewColumns: Column<TicketItem>[] = [
    {
      header: "Ticket ID",
      accessor: (item) => (
        <span className="font-mono text-xs font-bold text-slate-200">{item.ticketNumber}</span>
      ),
    },
    {
      header: "Movie & Seat",
      accessor: (item) => (
        <div>
          <div className="font-semibold text-slate-100">{item.show?.movie?.title}</div>
          <span className="text-amber-400 font-mono text-xs font-bold">Seat {item.seatNumber}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            item.status === "ACTIVATED"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : item.status === "CANCELLED"
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-8">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              {/* Welcome Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Phase 7 Studio Content & Theatrical Distribution Active
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      Welcome back, {user?.name || "Administrator"}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                      Issue privacy-preserving QR tickets, monitor admission activations, and protect screening sessions in PostgreSQL.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadAllData()}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("tickets")}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Issue Tickets</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="cursor-pointer" onClick={() => setActiveTab("theatres")}>
                  <StatCard
                    title="Theatres"
                    value={stats.totalTheatres}
                    subtitle="Registered venues"
                    icon={Building2}
                    color="indigo"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => setActiveTab("theatres")}>
                  <StatCard
                    title="Screens"
                    value={stats.totalScreens}
                    subtitle="Auditoriums"
                    icon={Tv}
                    color="cyan"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => setActiveTab("movies")}>
                  <StatCard
                    title="Movies"
                    value={stats.totalMovies}
                    subtitle="Protected titles"
                    icon={Film}
                    color="indigo"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => setActiveTab("shows")}>
                  <StatCard
                    title="Upcoming Shows"
                    value={stats.upcomingShows}
                    subtitle="Scheduled sessions"
                    icon={CalendarCheck}
                    color="emerald"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => setActiveTab("tickets")}>
                  <StatCard
                    title="Tickets Issued"
                    value={stats.ticketsIssued}
                    subtitle="Active QR units"
                    icon={Ticket}
                    color="amber"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => setActiveTab("verifications")}>
                  <StatCard
                    title="Active Activations"
                    value={stats.activeVerifications}
                    subtitle="Validated admissions"
                    icon={ShieldCheck}
                    color="emerald"
                    trend="Protected"
                  />
                </div>
              </div>

              {/* Core Tables & Overview Section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Shows List */}
                <div className="xl:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Live & Scheduled Screenings</h2>
                      <p className="text-xs text-slate-400">
                        Real-time status of screenings across monitored screens
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("shows")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      View All Shows &rarr;
                    </button>
                  </div>
                  <DataTable
                    columns={showOverviewColumns}
                    data={shows.slice(0, 5)}
                    emptyMessage="No scheduled shows found in PostgreSQL. Click 'Schedule Show' to add one."
                  />
                </div>

                {/* Recent Issued Tickets Quick View */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Recent Issued Tickets</h2>
                      <p className="text-xs text-slate-400">
                        Latest generated QR admissions
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("tickets")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Manage Tickets &rarr;
                    </button>
                  </div>
                  <DataTable
                    columns={ticketOverviewColumns}
                    data={tickets.slice(0, 5)}
                    emptyMessage="No tickets issued yet. Click 'Issue Tickets' to generate QR admissions."
                  />
                </div>
              </div>

              {/* Status Banner */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      Phase 4 Security Staff Verification Engine Active
                    </h3>
                    <p className="text-xs text-slate-400">
                      Live checkpoint camera scanning with real-time PostgreSQL validation and admission audit logs.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("verifications")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl shadow-md shadow-indigo-600/20 whitespace-nowrap"
                >
                  Open Checkpoint Scanner &rarr;
                </button>
              </div>
            </>
          )}

          {/* TAB: DISASTER RECOVERY & BUSINESS CONTINUITY (PHASE 35) */}
          {activeTab === "disaster-recovery" && (
            <DisasterRecoveryDashboard user={user} />
          )}

          {/* TAB 2: THEATRES MANAGEMENT */}
          {activeTab === "theatres" && (
            <TheatreManagement theatres={theatres} onRefresh={() => loadAllData()} />
          )}

          {/* TAB 3: MOVIES CATALOG */}
          {activeTab === "movies" && (
            <MovieManagement movies={movies} onRefresh={() => loadAllData()} />
          )}

          {/* TAB 4: SHOWS MANAGEMENT */}
          {activeTab === "shows" && (
            <ShowManagement
              shows={shows}
              theatres={theatres}
              movies={movies}
              onRefresh={() => loadAllData()}
            />
          )}

          {/* TAB 5: TICKETS MANAGEMENT (PHASE 3) */}
          {activeTab === "tickets" && (
            <TicketManagement
              tickets={tickets}
              shows={shows}
              onRefresh={() => loadAllData()}
            />
          )}

          {/* TAB 6: SECURITY STAFF VERIFICATION (PHASE 4) */}
          {activeTab === "verifications" && (
            <SecurityStaffVerification
              user={user}
              tickets={tickets}
              shows={shows}
              onRefreshStats={() => loadAllData()}
            />
          )}

          {/* TAB 7: DYNAMIC ANTI-PIRACY PROTECTION LAYER (PHASE 6) */}
          {activeTab === "protection" && (
            <ProtectionMonitoring
              user={user}
              tickets={tickets}
              shows={shows}
              onRefresh={() => loadAllData()}
            />
          )}

          {/* TAB: FORENSIC EVIDENCE VAULT (PHASE 17) */}
          {activeTab === "evidence" && <EvidenceVault />}

          {/* TAB: COMPLIANCE & RETENTION OPERATIONS (PHASE 17) */}
          {activeTab === "compliance" && <ComplianceOperationsDashboard />}

          {/* TAB: REAL-TIME ANTI-PIRACY & AUTOMATED SOC RESPONSE (PHASE 16) */}
          {activeTab === "realtime" && (
            <div className="space-y-8">
              <ThreatRiskHeatmap
                theatres={theatres}
                movies={movies}
                sessions={[]}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RealtimeThreatTimeline
                  events={realtimeEvents}
                  loading={loading}
                />
                <RealtimeIncidentCenter
                  notifications={realtimeIncidents}
                  onRefresh={() => loadAllData()}
                  onNavigateToForensics={() => setActiveTab("investigations")}
                />
              </div>
            </div>
          )}

          {/* TAB: PRODUCTION OPERATIONS CENTER (PHASE 36) */}
          {activeTab === "production-ops" && (
            <EnterpriseProductionOpsDashboard />
          )}

          {/* TAB: DISASTER RECOVERY & RESILIENCE (PHASE 35) */}
          {activeTab === "disaster-recovery" && (
            <DisasterRecoveryDashboard />
          )}

          {/* TAB: END-TO-END DEMO PANEL (PHASE 30) */}
          {activeTab === "demo" && (
            <EndToEndDemoPanel user={user} />
          )}

          {/* TAB: END-TO-END PIRACY RESPONSE ORCHESTRATION (PHASE 29) */}
          {activeTab === "orchestration" && (
            <EndToEndResponsePanel user={user} />
          )}

          {/* TAB: STUDIO INTELLIGENCE & EXECUTIVE REPORTING (PHASE 28) */}
          {activeTab === "studio-intel" && (
            <StudioIntelligenceDashboard
              user={user}
              onNavigateToInvestigations={() => setActiveTab("investigations")}
              onNavigateToEnforcement={() => setActiveTab("enforcement")}
            />
          )}

          {/* TAB: PIRACY RESPONSE & ENFORCEMENT (PHASE 27) */}
          {activeTab === "enforcement" && (
            <EnforcementCenter
              user={user}
              onRefreshGlobal={() => loadAllData()}
              onNavigateToCase={(caseId) => {
                setActiveTab("investigations");
              }}
            />
          )}

          {/* TAB: UNIFIED SECURITY OPERATIONS CENTER (PHASE 20) */}
          {activeTab === "unified-soc" && (
            <UnifiedSecurityOperationsCenter />
          )}

          {/* TAB: ZERO-TRUST & ENTERPRISE GOVERNANCE (PHASE 19) */}
          {activeTab === "governance" && (
            <EnterpriseGovernanceDashboard />
          )}

          {/* TAB: EXTERNAL THREAT & INDUSTRY INTELLIGENCE (PHASE 18) */}
          {activeTab === "external-intel" && (
            <ExternalThreatIntelligenceDashboard />
          )}

          {/* TAB: AI THREAT INTELLIGENCE & PREDICTIVE CENTER (PHASE 15) */}
          {activeTab === "intelligence" && (
            <div className="space-y-8">
              <ThreatIntelligenceDashboard
                onRefreshGlobal={() => loadAllData()}
                onNavigateToForensics={() => setActiveTab("investigations")}
                onNavigateToCommandCenter={() => setActiveTab("command-center")}
              />
              <ThreatIntelligenceCenter
                onRefreshGlobal={() => loadAllData()}
                onNavigateToForensics={() => setActiveTab("investigations")}
              />
            </div>
          )}

          {/* TAB: PRODUCTION TRAFFIC ENGINEERING & AUTO-SCALING (PHASE 16) */}
          {activeTab === "traffic" && (
            <TrafficEngineeringDashboard
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB: REAL-TIME ANTI-PIRACY COMMAND CENTER (PHASE 14) */}
          {activeTab === "command-center" && (
            <AntiPiracyCommandCenter
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB: FORENSIC INVESTIGATION CENTER (PHASE 13) */}
          {activeTab === "investigations" && (
            <ForensicInvestigationCenter
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB: PRODUCTION OPERATIONS DASHBOARD (PHASE 11) */}
          {activeTab === "operations" && (
            <ProductionOperationsDashboard
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB: SECURITY OPERATIONS (SOC) DASHBOARD (PHASE 10) */}
          {activeTab === "soc" && (
            <SecurityOperationsDashboard
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB 8: STUDIO CONTENT & THEATRICAL DISTRIBUTION (PHASE 7) */}
          {activeTab === "production" && (
            <ProductionDashboard
              user={user}
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB: DRM INTEGRATION & LICENSING ARCHITECTURE (PHASE 9B) */}
          {activeTab === "drm" && (
            <DrmMonitoringDashboard
              onRefreshGlobal={() => loadAllData()}
            />
          )}

          {/* TAB 9: PRODUCTION COMPANIES MANAGEMENT (PHASE 7 - ADMIN) */}
          {activeTab === "companies" && (
            <ProductionCompanyManagement
              companies={companies}
              onRefresh={() => loadAllData()}
            />
          )}

          {/* TAB 10: SETTINGS PLACEHOLDER */}
          {activeTab === "settings" && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/40 space-y-3">
              <ShieldAlert className="w-12 h-12 text-indigo-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-200 uppercase tracking-wide">
                Security & Settings
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Advanced DRM encryption keys and auditorium watermark configurations will be manageable here.
              </p>
              <button
                onClick={() => setActiveTab("dashboard")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
