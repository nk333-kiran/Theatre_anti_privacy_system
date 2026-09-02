"use client";

import React, { useState } from "react";
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Check,
  Film,
  Layers,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Search,
} from "lucide-react";
import {
  ProductionCompanyItem,
  createProductionCompany,
  updateProductionCompany,
} from "../../lib/api";

interface ProductionCompanyManagementProps {
  companies: ProductionCompanyItem[];
  onRefresh: () => void;
}

export const ProductionCompanyManagement: React.FC<ProductionCompanyManagementProps> = ({
  companies,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ProductionCompanyItem | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const openCreateModal = () => {
    setError(null);
    setName("");
    setCode(`PC-${Math.floor(100 + Math.random() * 900)}`);
    setContactEmail("");
    setContactPhone("");
    setStatus("ACTIVE");
    setEditingCompany(null);
    setShowAddModal(true);
  };

  const openEditModal = (c: ProductionCompanyItem) => {
    setError(null);
    setName(c.name);
    setCode(c.code);
    setContactEmail(c.contactEmail);
    setContactPhone(c.contactPhone || "");
    setStatus(c.status);
    setEditingCompany(c);
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingCompany) {
        const res = await updateProductionCompany(editingCompany.id, {
          name,
          contactEmail,
          contactPhone,
          status,
        });
        if (res.success) {
          setShowAddModal(false);
          onRefresh();
        } else {
          setError(res.message || "Failed to update production company");
        }
      } else {
        const res = await createProductionCompany({
          name,
          code,
          contactEmail,
          contactPhone,
        });
        if (res.success) {
          setShowAddModal(false);
          onRefresh();
        } else {
          setError(res.message || "Failed to create production company");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-400" />
            Studio & Production Companies
          </h2>
          <p className="text-xs text-slate-400">
            Registered content owners authorized to publish movies and manage theatrical distributions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studios..."
              className="bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Studio</span>
          </button>
        </div>
      </div>

      {/* Studios Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Building className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Production Companies Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Register production companies so movie owners can publish titles and authorize theatre distribution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company) => (
            <div
              key={company.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base group-hover:text-indigo-400 transition-colors">
                      {company.name}
                    </h3>
                    <span className="inline-block mt-1 font-mono text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                      ID: {company.code}
                    </span>
                  </div>

                  <button
                    onClick={() => openEditModal(company)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Studio"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{company.contactEmail}</span>
                  </div>
                  {company.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{company.contactPhone}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Movies: <strong className="text-slate-200">{company._count?.movies ?? 0}</strong></span>
                  <span>Releases: <strong className="text-indigo-400">{company._count?.releases ?? 0}</strong></span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Users: {company._count?.users ?? 0}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {company.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit Studio */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              {editingCompany ? "Edit Studio Profile" : "Register Production Company"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Authorized studio entity for content lifecycle & distribution rights.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Pictures International"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Studio Code *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCompany}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PC-APEX"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-200 uppercase focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="distribution@apexstudio.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {editingCompany && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/30 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Saving..." : editingCompany ? "Save Changes" : "Register Studio"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
