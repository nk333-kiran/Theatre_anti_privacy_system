"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Ticket,
  Plus,
  QrCode,
  Ban,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Tv,
  Film,
  AlertCircle,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  TicketItem,
  ShowItem,
  createTickets,
  cancelTicket,
} from "../../lib/api";

interface TicketManagementProps {
  tickets: TicketItem[];
  shows: ShowItem[];
  onRefresh: () => void;
}

export const TicketManagement: React.FC<TicketManagementProps> = ({
  tickets,
  shows,
  onRefresh,
}) => {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<TicketItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for issuing tickets
  const [selectedShowId, setSelectedShowId] = useState("");
  const [seatInput, setSeatInput] = useState("");
  const [priceInput, setPriceInput] = useState("15.00");

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterShow, setFilterShow] = useState("");

  // When QR modal opens for a ticket, generate QR data URL
  useEffect(() => {
    if (selectedTicketForQr && selectedTicketForQr.activation) {
      const activationUrl = `${window.location.origin}/activate?code=${selectedTicketForQr.activation.activationCode}`;
      QRCode.toDataURL(activationUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Generation error:", err));
    } else {
      setQrDataUrl("");
    }
  }, [selectedTicketForQr]);

  const openIssueModal = () => {
    setError(null);
    setSelectedShowId(shows[0]?.id || "");
    setSeatInput("A1, A2, A3");
    setPriceInput("15.00");
    setShowIssueModal(true);
  };

  const handleIssueTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedShowId) {
        throw new Error("Please select a show.");
      }

      // Split comma or space separated seat numbers
      const seatList = seatInput
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      if (seatList.length === 0) {
        throw new Error("Please enter at least one seat number.");
      }

      const res = await createTickets({
        showId: selectedShowId,
        seats: seatList,
        price: Number(priceInput) || 15.0,
      });

      if (!res.success) throw new Error(res.message);

      setShowIssueModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to issue tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = async (id: string, number: string) => {
    if (!confirm(`Are you sure you want to cancel ticket "${number}"? This will revoke its activation.`)) return;
    try {
      const res = await cancelTicket(id);
      if (!res.success) {
        alert(res.message || "Failed to cancel ticket");
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Error cancelling ticket");
    }
  };

  const copyActivationLink = (code: string) => {
    const url = `${window.location.origin}/activate?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterShow && t.showId !== filterShow) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = t.ticketNumber.toLowerCase().includes(q);
      const matchSeat = t.seatNumber.toLowerCase().includes(q);
      const matchMovie = t.show?.movie?.title?.toLowerCase().includes(q);
      if (!matchNum && !matchSeat && !matchMovie) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-400" />
            Ticket Issuance & QR Activation System
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue seat tickets with cryptographically secure, privacy-preserving QR activation tokens
          </p>
        </div>

        <button
          onClick={openIssueModal}
          disabled={shows.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Issue Tickets</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Ticket ID, Seat, Movie..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={filterShow}
          onChange={(e) => setFilterShow(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Shows</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.movie.title} ({s.screen.name} &bull; {new Date(s.startTime).toLocaleDateString()})
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="ISSUED">ISSUED</option>
          <option value="ACTIVATED">ACTIVATED</option>
          <option value="USED">USED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {(search || filterShow || filterStatus) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterShow("");
              setFilterStatus("");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tickets Table */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Tickets Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {shows.length === 0
              ? "Please schedule a show first before issuing tickets."
              : "Issue tickets for scheduled screening sessions."}
          </p>
          {shows.length > 0 && (
            <button
              onClick={openIssueModal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              + Issue First Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Ticket ID</th>
                <th className="px-4 py-3.5">Movie & Show</th>
                <th className="px-4 py-3.5">Theatre & Screen</th>
                <th className="px-4 py-3.5">Seat</th>
                <th className="px-4 py-3.5">Ticket Status</th>
                <th className="px-4 py-3.5">Anti-Piracy Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTickets.map((ticket) => {
                const isCancelled = ticket.status === "CANCELLED";
                const isActivated = ticket.status === "ACTIVATED";
                const isPending = ticket.status === "ISSUED";

                return (
                  <tr key={ticket.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-200 font-bold">
                      {ticket.ticketNumber}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{ticket.show.movie.title}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {new Date(ticket.show.startTime).toLocaleDateString()} &bull;{" "}
                        {new Date(ticket.show.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-200 text-xs">{ticket.show.theatre.name}</div>
                      <div className="text-xs text-indigo-400 font-mono">{ticket.show.screen.name}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
                        {ticket.seatNumber}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isCancelled
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : isActivated
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {ticket.activation ? (
                        <div className="flex items-center gap-1 text-xs">
                          {ticket.activation.status === "ACTIVE" ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-medium font-mono text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" /> ACTIVE
                            </span>
                          ) : ticket.activation.status === "REVOKED" ? (
                            <span className="text-rose-400 font-mono text-[11px]">REVOKED</span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">PENDING_SCAN</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">No token</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTicketForQr(ticket)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-indigo-500/30 transition-colors"
                          title="View QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR Code</span>
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelTicket(ticket.id, ticket.ticketNumber)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="Cancel Ticket"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Issue Tickets */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowIssueModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Issue Screening Tickets</h3>
            <p className="text-xs text-slate-400 mb-5">
              Assign seat allocations and generate unguessable activation QR codes.
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleIssueTickets} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Select Show Session *
                </label>
                <select
                  required
                  value={selectedShowId}
                  onChange={(e) => setSelectedShowId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    -- Select Show --
                  </option>
                  {shows.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.movie.title} &bull; {s.theatre.name} ({s.screen.name}) &bull;{" "}
                      {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Seat Numbers (Comma or space separated) *
                </label>
                <input
                  type="text"
                  required
                  value={seatInput}
                  onChange={(e) => setSeatInput(e.target.value)}
                  placeholder="e.g. A1, A2, A3, B1, B2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  A unique QR code with cryptographic token will be generated for each seat.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Ticket Price ($)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {loading ? "Generating Tokens..." : "Generate & Issue Tickets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View QR Code */}
      {selectedTicketForQr && selectedTicketForQr.activation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
            <button
              onClick={() => setSelectedTicketForQr(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2">
              <QrCode className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-100">
              {selectedTicketForQr.show.movie.title}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Seat: <span className="text-amber-400 font-bold">{selectedTicketForQr.seatNumber}</span> &bull; {selectedTicketForQr.ticketNumber}
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl inline-block shadow-xl mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${selectedTicketForQr.ticketNumber}`}
                  className="w-56 h-56 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Privacy Guarantee Note */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1 mb-4">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-PII Privacy Protection</span>
              </div>
              <p className="text-slate-500">
                QR payload contains strictly a secure activation token. No personal names, contacts, or internal credentials are stored inside this QR code.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyActivationLink(selectedTicketForQr.activation!.activationCode)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>

              <a
                href={`/activate?code=${selectedTicketForQr.activation.activationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Scan</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
