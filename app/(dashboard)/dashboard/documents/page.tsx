"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderCheck, Brain, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface DocRow extends Record<string, string> {}

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [reviewModal, setReviewModal] = useState<{ open: boolean; doc: DocRow | null }>({ open: false, doc: null });
  const [verifying, setVerifying] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filtered = docs.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d["Full Name"]?.toLowerCase().includes(q) ||
      d["Screening ID (For internal use only)"]?.toLowerCase().includes(q) ||
      d["Position Screened For"]?.toLowerCase().includes(q)
    );
  });

  async function runAIVerify() {
    if (!reviewModal.doc) return;
    setVerifying(true);
    const sid = reviewModal.doc["Screening ID (For internal use only)"];
    const res = await fetch("/api/documents/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screeningId: sid }),
    });
    const data = await res.json();
    setVerifying(false);
    if (res.ok) {
      await fetchDocs();
      setReviewModal(prev => ({
        open: true,
        doc: prev.doc ? {
          ...prev.doc,
          "AI Verification Status": data.result.status,
          "AI ID Proof Verification": data.result.idProofCheck,
          "AI Degree Verification": data.result.degreeCheck,
          "AI Appointment Letter Verification": data.result.appointmentCheck,
          "AI Pay Slips Verification": data.result.paySlipsCheck,
          "AI CV Verification": data.result.cvCheck,
          "AI Verification Flags": data.result.flags,
          "AI Recommendation": data.result.recommendation,
        } : null,
      }));
    } else {
      alert(data.error ?? "Verification failed");
    }
  }

  async function markStatus(status: "VERIFIED" | "FLAGGED") {
    if (!reviewModal.doc) return;
    setSavingStatus(true);
    await fetch("/api/documents/verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        screeningId: reviewModal.doc["Screening ID (For internal use only)"],
        status,
      }),
    });
    setSavingStatus(false);
    setReviewModal({ open: false, doc: null });
    fetchDocs();
  }

  function statusBadge(d: DocRow) {
    if (d["Verification Complete"] === "Yes") return { label: "Verified", cls: "bg-emerald-100 text-emerald-700" };
    const ai = d["AI Verification Status"];
    if (ai === "VERIFIED") return { label: "AI: Clean", cls: "bg-blue-100 text-blue-700" };
    if (ai === "FLAGS_FOUND") return { label: "AI: Flagged", cls: "bg-orange-100 text-orange-700" };
    if (ai === "INCOMPLETE") return { label: "AI: Incomplete", cls: "bg-yellow-100 text-yellow-700" };
    return { label: "Pending Review", cls: "bg-slate-100 text-slate-600" };
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Document Verification Queue</h1>
        <p className="text-slate-500 text-sm mt-1">{filtered.length} submissions</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Search by candidate or Screening ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No document submissions yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidate</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Position</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Submitted</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d, i) => {
                const badge = statusBadge(d);
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{d["Full Name"] || "—"}</p>
                      <p className="text-xs text-slate-400 font-mono">{d["Screening ID (For internal use only)"]}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d["Position Screened For"] || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{d["Timestamp"]?.split(",")[0]}</td>
                    <td className="px-4 py-3"><Badge className={badge.cls}>{badge.label}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setReviewModal({ open: true, doc: d })}>Review</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={reviewModal.open}
        onClose={() => setReviewModal({ open: false, doc: null })}
        title={`Documents — ${reviewModal.doc?.["Full Name"] ?? ""}`}
        size="lg"
      >
        {reviewModal.doc && (
          <div className="p-6 space-y-5">
            {/* Candidate info */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-xl p-4">
              <div><p className="text-xs text-slate-500">Screening ID</p><p className="font-mono text-slate-800">{reviewModal.doc["Screening ID (For internal use only)"]}</p></div>
              <div><p className="text-xs text-slate-500">Position</p><p className="text-slate-800">{reviewModal.doc["Position Screened For"] || "—"}</p></div>
              <div><p className="text-xs text-slate-500">Phone</p><p className="text-slate-800">{reviewModal.doc["Phone No."] || "—"}</p></div>
              <div><p className="text-xs text-slate-500">Email</p><p className="text-slate-800">{reviewModal.doc["Personal Email ID"] || "—"}</p></div>
            </div>

            {/* Document links */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Uploaded Documents</p>
              <div className="space-y-2">
                {[
                  ["ID proof", "ID Proof"],
                  ["Degree certificate(s)", "Degree"],
                  ["Appointment letter from your current/last employer", "Appointment Letter"],
                  ["Last three months' pay slips", "Pay Slips"],
                  ["Latest CV", "Latest CV"],
                ].map(([key, label]) => {
                  const val = reviewModal.doc?.[key] ?? "";
                  const isUrl = /^https?:\/\//i.test(val);
                  return (
                    <div key={key} className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg gap-3">
                      <span className="text-sm text-slate-700 shrink-0">{label}</span>
                      {isUrl ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 flex items-center gap-1 hover:underline truncate max-w-md">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{val}</span>
                        </a>
                      ) : val ? (
                        <span className="text-xs text-slate-500 truncate max-w-md" title={val}>{val}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Not submitted</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI verification result */}
            {reviewModal.doc["AI Verification Status"] && (
              <div className={`rounded-xl p-4 border ${
                reviewModal.doc["AI Verification Status"] === "VERIFIED" ? "bg-emerald-50 border-emerald-200" :
                reviewModal.doc["AI Verification Status"] === "FLAGS_FOUND" ? "bg-orange-50 border-orange-200" :
                "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4" />
                  <p className="text-sm font-semibold">AI Verification: {reviewModal.doc["AI Verification Status"]}</p>
                </div>
                <div className="space-y-1">
                  {[
                    ["AI ID Proof Verification", "ID Proof"],
                    ["AI Degree Verification", "Degree"],
                    ["AI Appointment Letter Verification", "Appointment Letter"],
                    ["AI Pay Slips Verification", "Pay Slips"],
                    ["AI CV Verification", "CV"],
                  ].map(([key, label]) => {
                    const v = reviewModal.doc?.[key];
                    if (!v) return null;
                    const ok = v.toLowerCase().startsWith("ok");
                    return (
                      <p key={key} className="text-xs text-slate-700">
                        <strong className={ok ? "text-emerald-700" : "text-orange-700"}>{label}:</strong> {v}
                      </p>
                    );
                  })}
                </div>
                {reviewModal.doc["AI Verification Flags"] && (
                  <p className="text-xs text-slate-700 mt-2 pt-2 border-t border-slate-200"><strong>Flags:</strong> {reviewModal.doc["AI Verification Flags"]}</p>
                )}
                {reviewModal.doc["AI Recommendation"] && (
                  <p className="text-xs text-slate-700 mt-1"><strong>Recommendation:</strong> {reviewModal.doc["AI Recommendation"]}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={runAIVerify} disabled={verifying}>
                <Brain className="w-4 h-4" />
                {verifying ? "Running AI…" : "Run AI Verification"}
              </Button>
              <div className="flex-1" />
              {reviewModal.doc["Verification Complete"] !== "Yes" && (
                <>
                  <Button variant="secondary" onClick={() => markStatus("FLAGGED")} disabled={savingStatus}>
                    <AlertTriangle className="w-4 h-4" />
                    Flag
                  </Button>
                  <Button onClick={() => markStatus("VERIFIED")} disabled={savingStatus}>
                    <CheckCircle className="w-4 h-4" />
                    Mark Verified
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => router.push(`/dashboard/candidates/${reviewModal.doc!["Screening ID (For internal use only)"]}`)}>
                Open Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
