"use client";

import React, { useState } from "react";
import {
  Film,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Globe,
  Star,
  AlertCircle,
  X,
} from "lucide-react";
import {
  MovieItem,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../../lib/api";

interface MovieManagementProps {
  movies: MovieItem[];
  onRefresh: () => void;
}

export const MovieManagement: React.FC<MovieManagementProps> = ({
  movies,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("120");
  const [language, setLanguage] = useState("English");
  const [rating, setRating] = useState("PG-13");
  const [posterUrl, setPosterUrl] = useState("");

  const openCreateModal = () => {
    setError(null);
    setTitle("");
    setDescription("");
    setDuration("120");
    setLanguage("English");
    setRating("PG-13");
    setPosterUrl("");
    setEditingMovie(null);
    setShowAddModal(true);
  };

  const openEditModal = (m: MovieItem) => {
    setError(null);
    setTitle(m.title);
    setDescription(m.description || "");
    setDuration(String(m.durationMinutes));
    setLanguage(m.language);
    setRating(m.rating || "PG-13");
    setPosterUrl(m.posterUrl || "");
    setEditingMovie(m);
    setShowAddModal(true);
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editingMovie) {
        const res = await updateMovie(editingMovie.id, {
          title,
          description,
          durationMinutes: Number(duration),
          language,
          rating,
          posterUrl,
        });
        if (!res.success) throw new Error(res.message);
      } else {
        const res = await createMovie({
          title,
          description,
          durationMinutes: Number(duration),
          language,
          rating,
          posterUrl,
        });
        if (!res.success) throw new Error(res.message);
      }
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to save movie");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMovie = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove movie "${name}"?`)) return;
    try {
      const res = await deleteMovie(id);
      if (!res.success) {
        alert(res.message || "Failed to delete movie");
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Error deleting movie");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            Movies Catalog & Protected Titles
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Register films with exact runtimes for automated schedule collision calculation
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Movie</span>
        </button>
      </div>

      {/* Grid of Movies */}
      {movies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
          <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Movies Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Add movie titles, duration, and ratings to enable show scheduling across screens.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            + Add First Movie
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {movie.rating || "PG-13"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(movie)}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                      title="Edit Movie"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMovie(movie.id, movie.title)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title="Delete Movie"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-100 text-base mb-1.5 group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {movie.title}
                </h3>

                {movie.description && (
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{movie.description}</p>
                )}

                <div className="space-y-1.5 text-xs text-slate-300 font-mono pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{movie.durationMinutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>{movie.language}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Active Shows: {movie._count?.shows ?? 0}</span>
                <span className="text-indigo-400">ID: {movie.id.slice(0, 6)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit Movie */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              {editingMovie ? "Edit Movie Metadata" : "Add Movie to Catalog"}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Specify runtime in minutes to automate schedule conflict protection.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveMovie} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Movie Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dune: Part Two"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Duration (Mins) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="120"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Language *
                  </label>
                  <input
                    type="text"
                    required
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="English"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Rating
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="G">G</option>
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="R">R</option>
                    <option value="NC-17">NC-17</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Synopsis / Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plot summary or security handling instructions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
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
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingMovie ? "Update Movie" : "Add Movie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
