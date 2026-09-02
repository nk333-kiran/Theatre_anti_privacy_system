"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Building,
  CalendarCheck,
  ShieldCheck,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Search,
  Filter,
  RefreshCw,
  FolderPlus,
  Send,
  Sparkles,
  Info,
  Tv,
  Check,
  ChevronRight,
  HardDrive,
  FileCode,
  Upload,
} from "lucide-react";
import { VideoUploadManager } from "./VideoUploadManager";
import {
  UserProfile,
  MovieItem,
  TheatreItem,
  MovieReleaseItem,
  ContentAssetItem,
  MovieAuditEventItem,
  ProductionCompanyDashboardStats,
  ContentStatus,
  ReleaseStatus,
  fetchProductionMovies,
  createProductionMovie,
  updateProductionMovie,
  addContentAsset,
  deleteContentAsset,
  fetchMovieReleases,
  createMovieRelease,
  approveMovieRelease,
  rejectMovieRelease,
  fetchMovieAudits,
  fetchProductionDashboardStats,
  fetchTheatres,
} from "../../lib/api";

interface ProductionDashboardProps {
  user: UserProfile | null;
  onRefreshGlobal?: () => void;
}

export const ProductionDashboard: React.FC<ProductionDashboardProps> = ({
  user,
  onRefreshGlobal,
}) => {
  const [stats, setStats] = useState<ProductionCompanyDashboardStats>({
    totalMovies: 0,
    activeReleases: 0,
    assignedTheatres: 0,
    activeProtectionSessions: 0,
    protectionEvents: 0,
  });

  const [movies, setMovies] = useState<any[]>([]);
  const [releases, setReleases] = useState<MovieReleaseItem[]>([]);
  const [theatres, setTheatres] = useState<TheatreItem[]>([]);
  const [audits, setAudits] = useState<MovieAuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab inside production dashboard
  const [activeSection, setActiveSection] = useState<"movies" | "uploads" | "releases" | "audits">("movies");

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [releaseStatusFilter, setReleaseStatusFilter] = useState<string>("");
  const [movieSearch, setMovieSearch] = useState<string>("");

  // Modals
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<any | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [managingAssetsMovie, setManagingAssetsMovie] = useState<any | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);

  // Form states: Movie
  const [movieTitle, setMovieTitle] = useState("");
  const [movieDesc, setMovieDesc] = useState("");
  const [movieSynopsis, setMovieSynopsis] = useState("");
  const [movieDuration, setMovieDuration] = useState("120");
  const [movieLanguage, setMovieLanguage] = useState("English");
  const [movieRating, setMovieRating] = useState("PG-13");
  const [moviePoster, setMoviePoster] = useState("");
  const [movieReleaseDate, setMovieReleaseDate] = useState("");
  const [movieContentStatus, setMovieContentStatus] = useState<ContentStatus>("DRAFT");

  // Form states: Release
  const [selectedMovieIdForRelease, setSelectedMovieIdForRelease] = useState("");
  const [selectedTheatreIdForRelease, setSelectedTheatreIdForRelease] = useState("");
  const [selectedScreenIdForRelease, setSelectedScreenIdForRelease] = useState("");
  const [releaseStartDate, setReleaseStartDate] = useState("");
  const [releaseEndDate, setReleaseEndDate] = useState("");

  // Form states: Asset Metadata Placeholder
  const [assetType, setAssetType] = useState("FEATURE_FILM");
  const [assetResolution, setAssetResolution] = useState("4K DCI (4096x2160)");
  const [assetFileRef, setAssetFileRef] = useState("");
  const [assetDuration, setAssetDuration] = useState("120");
  const [assetSizeMb, setAssetSizeMb] = useState("24500");

  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, moviesData, releasesData, theatresData, auditsData] = await Promise.all([
        fetchProductionDashboardStats().catch(() => ({
          totalMovies: 0,
          activeReleases: 0,
          assignedTheatres: 0,
          activeProtectionSessions: 0,
          protectionEvents: 0,
        })),
        fetchProductionMovies({ contentStatus: statusFilter || undefined }).catch(() => []),
        fetchMovieReleases({ status: releaseStatusFilter || undefined }).catch(() => []),
        fetchTheatres().catch(() => []),
        fetchMovieAudits().catch(() => []),
      ]);

      setStats(statsData);
      setMovies(moviesData);
      setReleases(releasesData);
      setTheatres(theatresData);
      setAudits(auditsData);
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      console.error("Error loading production dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [statusFilter, releaseStatusFilter]);

  // Open Create Movie Modal
  const openCreateMovieModal = () => {
    setError(null);
    setMovieTitle("");
    setMovieDesc("");
    setMovieSynopsis("");
    setMovieDuration("120");
    setMovieLanguage("English");
    setMovieRating("PG-13");
    setMoviePoster("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80");
    setMovieReleaseDate(new Date().toISOString().split("T")[0]);
    setMovieContentStatus("DRAFT");
    setEditingMovie(null);
    setShowMovieModal(true);
  };

  // Open Edit Movie Modal
  const openEditMovieModal = (m: any) => {
    setError(null);
    setMovieTitle(m.title);
    setMovieDesc(m.description || "");
    setMovieSynopsis(m.synopsis || "");
    setMovieDuration(String(m.durationMinutes));
    setMovieLanguage(m.language);
    setMovieRating(m.rating || "PG-13");
    setMoviePoster(m.posterUrl || "");
    setMovieReleaseDate(m.releaseDate ? new Date(m.releaseDate).toISOString().split("T")[0] : "");
    setMovieContentStatus(m.contentStatus || "DRAFT");
    setEditingMovie(m);
    setShowMovieModal(true);
  };

  // Save Movie
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      if (editingMovie) {
        const res = await updateProductionMovie(editingMovie.id, {
          title: movieTitle,
          description: movieDesc,
          synopsis: movieSynopsis,
          durationMinutes: Number(movieDuration),
          language: movieLanguage,
          rating: movieRating,
          posterUrl: moviePoster,
          releaseDate: movieReleaseDate,
          contentStatus: movieContentStatus,
        });
        if (res.success) {
          setShowMovieModal(false);
          loadDashboardData();
        } else {
          setError(res.message || "Failed to update movie");
        }
      } else {
        const res = await createProductionMovie({
          title: movieTitle,
          description: movieDesc,
          synopsis: movieSynopsis,
          durationMinutes: Number(movieDuration),
          language: movieLanguage,
          rating: movieRating,
          posterUrl: moviePoster,
          releaseDate: movieReleaseDate,
          contentStatus: movieContentStatus,
        });
        if (res.success) {
          setShowMovieModal(false);
          loadDashboardData();
        } else {
          setError(res.message || "Failed to create movie");
        }
      }
    } catch (err: any) {
      setError(err.message || "Error saving movie");
    } finally {
      setActionLoading(false);
    }
  };

  // Save Release Request
  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovieIdForRelease || !selectedTheatreIdForRelease || !releaseStartDate || !releaseEndDate) {
      setError("Please fill in all release fields");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await createMovieRelease({
        movieId: selectedMovieIdForRelease,
        theatreId: selectedTheatreIdForRelease,
        screenId: selectedScreenIdForRelease || undefined,
        startDate: releaseStartDate,
        endDate: releaseEndDate,
      });

      if (res.success) {
        setShowReleaseModal(false);
        loadDashboardData();
      } else {
        setError(res.message || "Failed to create release authorization");
      }
    } catch (err: any) {
      setError(err.message || "Error creating release");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Release (Admin)
  const handleApproveRelease = async (id: string) => {
    try {
      const res = await approveMovieRelease(id);
      if (res.success) {
        loadDashboardData();
      } else {
        alert(res.message || "Failed to approve release");
      }
    } catch (err: any) {
      alert(err.message || "Error approving release");
    }
  };

  // Reject Release (Admin)
  const handleRejectRelease = async (id: string) => {
    const reason = prompt("Enter distribution rejection reason:", "Scheduling or licensing restriction");
    if (reason === null) return;

    try {
      const res = await rejectMovieRelease(id, reason);
      if (res.success) {
        loadDashboardData();
      } else {
        alert(res.message || "Failed to reject release");
      }
    } catch (err: any) {
      alert(err.message || "Error rejecting release");
    }
  };

  // Add Asset Metadata Placeholder
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAssetsMovie || !assetFileRef.trim()) return;

    setActionLoading(true);
    try {
      const res = await addContentAsset(managingAssetsMovie.id, {
        assetType,
        resolution: assetResolution,
        durationMinutes: Number(assetDuration),
        fileReference: assetFileRef.trim(),
        fileSizeMb: Number(assetSizeMb),
      });

      if (res.success) {
        setShowAddAssetModal(false);
        setAssetFileRef("");
        // Reload movies and update current managingAssetsMovie
        const updatedMovies = await fetchProductionMovies();
        setMovies(updatedMovies);
        const updatedCurrent = updatedMovies.find((m: any) => m.id === managingAssetsMovie.id);
        if (updatedCurrent) setManagingAssetsMovie(updatedCurrent);
      } else {
        alert(res.message || "Failed to register content asset");
      }
    } catch (err: any) {
      alert(err.message || "Error adding asset");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to remove this content asset reference?")) return;
    try {
      const res = await deleteContentAsset(assetId);
      if (res.success) {
        const updatedMovies = await fetchProductionMovies();
        setMovies(updatedMovies);
        const updatedCurrent = updatedMovies.find((m: any) => m.id === managingAssetsMovie.id);
        if (updatedCurrent) setManagingAssetsMovie(updatedCurrent);
      }
    } catch (err: any) {
      alert(err.message || "Error deleting asset");
    }
  };

  const filteredMovies = movies.filter((m: any) =>
    m.title.toLowerCase().includes(movieSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 shrink-0">
              <Film className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Phase 7 Content Management Active
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
                Studio Movie & Theatre Distribution Hub
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Register master movie titles, manage content lifecycle states, and authorize protected theatrical releases.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateMovieModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Movie</span>
            </button>

            <button
              onClick={() => {
                setError(null);
                if (movies.length > 0) setSelectedMovieIdForRelease(movies[0].id);
                if (theatres.length > 0) setSelectedTheatreIdForRelease(theatres[0].id);
                setReleaseStartDate(new Date().toISOString().split("T")[0]);
                const nextMonth = new Date();
                nextMonth.setDate(nextMonth.getDate() + 30);
                setReleaseEndDate(nextMonth.toISOString().split("T")[0]);
                setShowReleaseModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Authorize Release</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>TOTAL MOVIES</span>
            <Film className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.totalMovies}</div>
          <div className="text-[11px] text-slate-500 mt-1">Catalog titles registered</div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>ACTIVE RELEASES</span>
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.activeReleases}</div>
          <div className="text-[11px] text-slate-500 mt-1">Approved venue releases</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>THEATRE PARTNERS</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-200">{stats.assignedTheatres}</div>
          <div className="text-[11px] text-slate-500 mt-1">Authorized cinemas</div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>PROTECTED SESSIONS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.activeProtectionSessions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Audience screening streams</div>
        </div>

        <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>TELEMETRY EVENTS</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">{stats.protectionEvents}</div>
          <div className="text-[11px] text-slate-500 mt-1">Audit & security checks</div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveSection("movies")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeSection === "movies"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Movie Content & Lifecycle ({movies.length})</span>
        </button>

        <button
          onClick={() => setActiveSection("uploads")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeSection === "uploads"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Master Video & HLS Transcoding</span>
        </button>

        <button
          onClick={() => setActiveSection("releases")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeSection === "releases"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Theatre Distributions ({releases.length})</span>
        </button>

        <button
          onClick={() => setActiveSection("audits")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeSection === "audits"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Audit Log ({audits.length})</span>
        </button>
      </div>

      {/* SECTION: VIDEO UPLOADS & HLS PROCESSING (PHASE 9A) */}
      {activeSection === "uploads" && (
        <VideoUploadManager
          movies={movies}
          onAssetReady={() => loadDashboardData()}
        />
      )}

      {/* SECTION 1: MOVIES CATALOG & LIFECYCLE */}
      {activeSection === "movies" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                placeholder="Search movies by title..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Lifecycle States</option>
                <option value="DRAFT">DRAFT</option>
                <option value="UPLOADING">UPLOADING</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="READY">READY</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {filteredMovies.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-3">
              <Film className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No Movies Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Register a new movie title to begin preparing assets and scheduling theatre releases.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Image Frame */}
                    <div className="relative h-36 w-full bg-slate-950 overflow-hidden">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/60" />

                      {/* Content Lifecycle Badge */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            movie.contentStatus === "PUBLISHED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : movie.contentStatus === "READY"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : movie.contentStatus === "PROCESSING" || movie.contentStatus === "UPLOADING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {movie.contentStatus}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          onClick={() => openEditMovieModal(movie)}
                          className="p-1.5 bg-black/60 hover:bg-black/90 text-slate-200 rounded-lg backdrop-blur transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="font-bold text-white text-base truncate">{movie.title}</h3>
                        <p className="text-[11px] text-slate-300 font-mono">
                          {movie.durationMinutes} min &bull; {movie.language} &bull; {movie.rating || "PG-13"}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3 text-xs text-slate-400">
                      {movie.synopsis ? (
                        <p className="line-clamp-2 text-slate-400">{movie.synopsis}</p>
                      ) : (
                        <p className="italic text-slate-500">No synopsis provided.</p>
                      )}

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                        <span>Assets: <strong className="text-slate-200">{movie.assets?.length ?? 0}</strong></span>
                        <span>Releases: <strong className="text-indigo-400">{movie.releases?.length ?? 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => setManagingAssetsMovie(movie)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Manage Content Assets ({movie.assets?.length ?? 0})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: THEATRE RELEASES & DISTRIBUTION */}
      {activeSection === "releases" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Theatrical Distribution Authorizations</h3>
              <p className="text-xs text-slate-400">Authorized cinema venues permitted to schedule and screen master titles</p>
            </div>

            <select
              value={releaseStatusFilter}
              onChange={(e) => setReleaseStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Release Statuses</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          {releases.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              No theatre release authorizations requested yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Movie & Studio</th>
                    <th className="px-4 py-3">Authorized Venue</th>
                    <th className="px-4 py-3">Release Window</th>
                    <th className="px-4 py-3">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Admin Decision</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {releases.map((rel) => (
                    <tr key={rel.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-100">{rel.movie?.title}</div>
                        <div className="text-[11px] text-indigo-400 font-mono">{rel.productionCompany?.name}</div>
                      </td>

                      <td className="px-4 py-3 font-sans">
                        <div className="font-semibold text-slate-200">{rel.theatre?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {rel.theatre?.code} {rel.screen ? `• ${rel.screen.name}` : "• All Screens"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300 text-[11px]">
                        <div>{new Date(rel.startDate).toLocaleDateString()}</div>
                        <div className="text-slate-500">to {new Date(rel.endDate).toLocaleDateString()}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rel.status === "APPROVED" || rel.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : rel.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          }`}
                        >
                          {rel.status}
                        </span>
                        {rel.rejectionReason && (
                          <div className="text-[10px] text-rose-400 mt-1 font-sans truncate max-w-[140px]">
                            {rel.rejectionReason}
                          </div>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-3 text-right font-sans">
                          {rel.status === "PENDING_APPROVAL" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveRelease(rel.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRelease(rel.id)}
                                className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Decision Finalized</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: AUDIT LOG */}
      {activeSection === "audits" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Content & Release Audit Trail</h3>
            <p className="text-xs text-slate-400">Immutable ledger of title registrations and distribution approvals</p>
          </div>

          {audits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              No audit events logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Movie</th>
                    <th className="px-4 py-2.5">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold">
                          {a.action}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 font-sans font-semibold text-slate-200 truncate max-w-[140px]">
                        {a.movie?.title || "-"}
                      </td>

                      <td className="px-4 py-2.5 text-slate-400 font-sans">
                        {a.details || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Register / Edit Movie */}
      {showMovieModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowMovieModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              {editingMovie ? "Edit Movie Title" : "Register Master Movie Title"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter film metadata and set the current content lifecycle state.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveMovie} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Movie Title *</label>
                <input
                  type="text"
                  required
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="e.g. Inception: Origins"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Runtime (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={movieDuration}
                    onChange={(e) => setMovieDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Language *</label>
                  <input
                    type="text"
                    required
                    value={movieLanguage}
                    onChange={(e) => setMovieLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Rating</label>
                  <select
                    value={movieRating}
                    onChange={(e) => setMovieRating(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="G">G</option>
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="R">R</option>
                    <option value="NC-17">NC-17</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Content Lifecycle *</label>
                  <select
                    value={movieContentStatus}
                    onChange={(e) => setMovieContentStatus(e.target.value as ContentStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="UPLOADING">UPLOADING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="READY">READY</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Synopsis</label>
                <textarea
                  rows={2}
                  value={movieSynopsis}
                  onChange={(e) => setMovieSynopsis(e.target.value)}
                  placeholder="Short plot summary for theatre catalog..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Poster Image URL</label>
                <input
                  type="url"
                  value={moviePoster}
                  onChange={(e) => setMoviePoster(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/30 transition-colors disabled:opacity-50 mt-2"
              >
                {actionLoading ? "Saving..." : editingMovie ? "Update Movie" : "Register Master Title"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Authorize Theatre Release */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowReleaseModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Authorize Theatre Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select the film title and destination cinema venue for theatrical licensing.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateRelease} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Movie Title *</label>
                <select
                  required
                  value={selectedMovieIdForRelease}
                  onChange={(e) => setSelectedMovieIdForRelease(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.contentStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Destination Theatre *</label>
                <select
                  required
                  value={selectedTheatreIdForRelease}
                  onChange={(e) => {
                    setSelectedTheatreIdForRelease(e.target.value);
                    setSelectedScreenIdForRelease("");
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {theatres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={releaseStartDate}
                    onChange={(e) => setReleaseStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={releaseEndDate}
                    onChange={(e) => setReleaseEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/30 transition-colors disabled:opacity-50 mt-2"
              >
                {actionLoading ? "Submitting..." : "Submit Release Authorization"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drawer/Modal: Content Assets Inspector */}
      {managingAssetsMovie && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setManagingAssetsMovie(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{managingAssetsMovie.title}</h3>
                <p className="text-xs text-indigo-400 font-mono">Content Asset Vault (Metadata Placeholder)</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Attached Master Assets</span>
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset Reference</span>
              </button>
            </div>

            {managingAssetsMovie.assets && managingAssetsMovie.assets.length > 0 ? (
              <div className="space-y-2 mb-4">
                {managingAssetsMovie.assets.map((asset: ContentAssetItem) => (
                  <div
                    key={asset.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span>{asset.assetType}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {asset.processingStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                        Ref: {asset.fileReference}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {asset.resolution} &bull; {asset.durationMinutes} min &bull; {asset.fileSizeMb} MB
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete Asset Metadata"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 mb-4">
                No storage reference assets attached. Click "Add Asset Reference" above.
              </div>
            )}

            {/* Modal Inside for Add Asset */}
            {showAddAssetModal && (
              <form onSubmit={handleAddAsset} className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
                <h4 className="text-xs font-bold text-indigo-300 uppercase">Register New Asset Metadata</h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Asset Type</label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="FEATURE_FILM">FEATURE_FILM (Master DCP)</option>
                      <option value="TEASER_TRAILER">TEASER_TRAILER</option>
                      <option value="DRM_MANIFEST">DRM_MANIFEST</option>
                      <option value="AUDIO_TRACK">AUDIO_TRACK (Dolby Atmos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Resolution</label>
                    <input
                      type="text"
                      value={assetResolution}
                      onChange={(e) => setAssetResolution(e.target.value)}
                      placeholder="e.g. 4K DCI"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Vault Storage Reference URI *</label>
                  <input
                    type="text"
                    required
                    value={assetFileRef}
                    onChange={(e) => setAssetFileRef(e.target.value)}
                    placeholder="s3-vault://vault.antipiracy.io/movies/master-dcp-pkg-101.tar"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddAssetModal(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow"
                  >
                    {actionLoading ? "Saving..." : "Save Asset"}
                  </button>
                </div>
              </form>
            )}

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Phase 7 safely manages content metadata placeholders without storing unencrypted heavy video payloads.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
