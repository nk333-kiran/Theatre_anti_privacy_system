"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Building2,
  Tv,
  Film,
  Ban,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  ShowItem,
  TheatreItem,
  MovieItem,
  createShow,
  updateShow,
  cancelShow,
  deleteShow,
} from "../../lib/api";

interface ShowManagementProps {
  shows: ShowItem[];
  theatres: TheatreItem[];
  movies: MovieItem[];
  onRefresh: () => void;
}

export const ShowManagement: React.FC<ShowManagementProps> = ({
  shows,
  theatres,
  movies,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShow, setEditingShow] = useState<ShowItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedTheatreId, setSelectedTheatreId] = useState("");
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("SCHEDULED");

  // Filter shows state
  const [filterTheatre, setFilterTheatre] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Get available screens based on currently selected theatre in modal
  const activeTheatre = theatres.find((t) => t.id === selectedTheatreId);
  const availableScreens = activeTheatre?.screens || [];

  // When theatre selection changes, reset or pick first screen
  const handleTheatreChange = (thId: string) => {
    setSelectedTheatreId(thId);
    const th = theatres.find((t) => t.id === thId);
    if (th && th.screens.length > 0) {
      setSelectedScreenId(th.screens[0].id);
    } else {
      setSelectedScreenId("");
    }
  };

  // Helper to pre-calculate default datetime strings
  const getNextHourString = () => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0);
    d.setSeconds(0);
    // Format YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreateModal = () => {
    setError(null);
    const defaultTh = theatres[0]?.id || "";
    setSelectedTheatreId(defaultTh);
    setSelectedScreenId(theatres[0]?.screens[0]?.id || "");
    setSelectedMovieId(movies[0]?.id || "");
    setStartTime(getNextHourString());
    setEndTime("");
    setStatus("SCHEDULED");
    setEditingShow(null);
    setShowAddModal(true);
  };

  const openEditModal = (s: ShowItem) => {
    setError(null);
    setSelectedTheatreId(s.theatreId);
    setSelectedScreenId(s.screenId);
    setSelectedMovieId(s.movieId);

    // Format start & end for datetime-local
    const toInputFormat = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartTime(toInputFormat(s.startTime));
    setEndTime(toInputFormat(s.endTime));
    setStatus(s.status);
    setEditingShow(s);
    setShowAddModal(true);
  };

  const handleSaveShow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedTheatreId || !selectedScreenId || !selectedMovieId || !startTime) {
        throw new Error("Please select a Theatre, Screen, Movie, and Start Time.");
      }

      if (editingShow) {
        const res = await updateShow(editingShow.id, {
          theatreId: selectedTheatreId,
          screenId: selectedScreenId,
          movieId: selectedMovieId,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
          status,
        });
        if (!res.success) throw new Error(res.message);
      } else {
        const res = await createShow({
          theatreId: selectedTheatreId,
          screenId: selectedScreenId,
          movieId: selectedMovieId,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
          status,
        });
        if (!res.success) throw new Error(res.message);
      }

      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to schedule show");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShow = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled show?")) return;
    try {
      const res = await cancelShow(id);
      if (!res.success) {
        alert(res.message || "Failed to cancel show");
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Error cancelling show");
    }
  };

  const handleDeleteShow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this show record?")) return;
    try {
      const res = await deleteShow(id);
      if (!res.success) {
        alert(res.message || "Failed to delete show");
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Error deleting show");
    }
  };

  // Filter shows
  const filteredShows = shows.filter((s) => {
    if (filterTheatre && s.theatreId !== filterTheatre) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-400" />
            Show Schedules & Collision Prevention
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Book screenings with automatic audit checks to prevent double-booking on any screen
          </p>
        </div>

        <button
          onClick={openCreateModal}
          disabled={theatres.length === 0 || movies.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Show</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter:</span>
        <select
          value={filterTheatre}
          onChange={(e) => setFilterTheatre(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Theatres</option>
          {theatres.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {(filterTheatre || filterStatus) && (
          <button
            onClick={() => {
              setFilterTheatre("");
              setFilterStatus("");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Shows Listing */}
      {filteredShows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Shows Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {theatres.length === 0 || movies.length === 0
              ? "Please ensure you have at least one Theatre and Movie configured before creating shows."
              : "Schedule a screening across your configured screens."}
          </p>
          {theatres.length > 0 && movies.length > 0 && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              + Schedule First Show
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Movie</th>
                <th className="px-4 py-3.5">Theatre & Screen</th>
                <th className="px-4 py-3.5">Date & Time Slot</th>
                <th className="px-4 py-3.5">Tickets Issued</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredShows.map((show) => {
                const isCancelled = show.status === "CANCELLED";
                const isLive = show.status === "ACTIVE";

                return (
                  <tr key={show.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{show.movie.title}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {show.movie.durationMinutes}m &bull; {show.movie.language}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-200">{show.theatre.name}</div>
                      <div className="text-xs text-indigo-400 font-mono">
                        {show.screen.name} ({show.screen.capacity} seats)
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-mono text-xs">
                        {new Date(show.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(show.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
                        {new Date(show.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-300">
                      {show._count?.tickets ?? 0}
                    </td>

                    <td className="px-4 py-3">
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
                            isCancelled
                              ? "bg-rose-400"
                              : isLive
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-indigo-400"
                          }`}
                        />
                        {show.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(show)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Edit Show"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelShow(show.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                            title="Cancel Show"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteShow(show.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="Delete Show"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Schedule / Edit Show */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              {editingShow ? "Edit Show Schedule" : "Schedule New Screening"}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Select venue, screen auditorium, movie title, and start time.
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveShow} className="space-y-4">
              {/* Select Theatre */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Theatre Venue *
                </label>
                <select
                  required
                  value={selectedTheatreId}
                  onChange={(e) => handleTheatreChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    -- Select Theatre --
                  </option>
                  {theatres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Screen (Dynamically Filtered) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Screen Auditorium (Belonging to Selected Theatre) *
                </label>
                <select
                  required
                  value={selectedScreenId}
                  onChange={(e) => setSelectedScreenId(e.target.value)}
                  disabled={availableScreens.length === 0}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  {availableScreens.length === 0 ? (
                    <option value="">No screens in selected theatre</option>
                  ) : (
                    availableScreens.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (#{s.screenNumber}) &bull; Capacity: {s.capacity} seats
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Select Movie */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Movie Title *
                </label>
                <select
                  required
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    -- Select Movie --
                  </option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.durationMinutes} mins &bull; {m.language})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="Auto-calculated from runtime"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || availableScreens.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {loading ? "Checking schedule..." : editingShow ? "Update Show" : "Schedule Show"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
