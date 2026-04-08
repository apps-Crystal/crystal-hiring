"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, ChevronRight, Brain, User, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { decisionBadge, scoreBadgeClass, stageBadge } from "@/lib/utils";

interface Candidate {
  "Screening ID": string;
  "Candidate Name": string;
  "Source": string;
  "Position Screened for": string;
  "Department"?: string;
  "Total Years of Experience": string;
  "Timestamp": string;
  "Overall Candidate Fit Assessment": string;
  "AI Technical Score": string;
  "AI Culture Score": string;
  "AI Validation Flag": string;
  "AI Evaluation Status": string;
  "Stage": string;
  "Job location?": string;
  "Requisition Id": string;
  [key: string]: string | undefined;
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("Shortlisted");
  const [userRole, setUserRole] = useState("");
  const [rerunning, setRerunning] = useState<string | null>(null);

  async function rerunEvaluation(e: React.MouseEvent, screeningId: string) {
    e.stopPropagation();
    setRerunning(screeningId);
    try {
      await fetch(`/api/screening/${encodeURIComponent(screeningId)}/evaluate`, { method: "POST" });
      await fetchCandidates();
    } finally {
      setRerunning(null);
    }
  }

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stageFilter) params.set("stage", stageFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (decisionFilter) params.set("decision", decisionFilter);
    const res = await fetch(`/api/screening?${params}`);
    const data = await res.json();
    setCandidates(data.candidates ?? []);
    setLoading(false);
  }, [stageFilter, sourceFilter, decisionFilter]);

  useEffect(() => {
    fetchCandidates();
    fetch("/api/auth/session").then(r => r.json()).then(d => setUserRole(d.user?.role ?? ""));
  }, [fetchCandidates]);

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c["Candidate Name"]?.toLowerCase().includes(q) ||
      c["Screening ID"]?.toLowerCase().includes(q) ||
      c["Position Screened for"]?.toLowerCase().includes(q)
    );
  });

  const sources = [...new Set(candidates.map((c) => c["Source"]).filter(Boolean))];
  const decisions = [...new Set(candidates.map((c) => c["Overall Candidate Fit Assessment"]).filter(Boolean))];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Screened Candidates</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} candidates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search candidate, position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Stages</option>
          <option value="SCREENED">Screened</option>
          <option value="INTERVIEW">Interview</option>
          <option value="DOCUMENTS">Documents</option>
          <option value="OFFER">Offer</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Decisions</option>
          {decisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <Button variant="ghost" onClick={fetchCandidates}>
          <Filter className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidate</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Position</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Experience</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">HR Decision</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tech Score</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Culture</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">AI Flag</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Stage</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No candidates found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const dec = decisionBadge(c["Overall Candidate Fit Assessment"]);
                  const stage = stageBadge(c["Stage"]);
                  const aiFlag = c["AI Validation Flag"];
                  const aiStatus = c["AI Evaluation Status"];
                  const aiEvalDone = aiStatus === "COMPLETED";
                  const aiNeedsRun = !aiStatus || aiStatus === "PENDING" || aiStatus === "FAILED";

                  return (
                    <tr
                      key={c["Screening ID"]}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/candidates/${encodeURIComponent(c["Screening ID"])}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{c["Candidate Name"] || "—"}</p>
                        <p className="text-xs text-slate-400 font-mono">{c["Screening ID"]}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c["Position Screened for"] || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-slate-100 text-slate-600">{c["Source"] || "—"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c["Total Years of Experience"] || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={dec.class}>{dec.label || "—"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {aiEvalDone && c["AI Technical Score"] ? (
                          <Badge className={scoreBadgeClass(c["AI Technical Score"])}>
                            {c["AI Technical Score"]}/10
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300">
                            {c["AI Evaluation Status"] === "IN_PROGRESS" ? "..." : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {aiEvalDone && c["AI Culture Score"] ? (
                          <Badge className={scoreBadgeClass(c["AI Culture Score"])}>
                            {c["AI Culture Score"]}/10
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {aiEvalDone && aiFlag ? (
                          <div className="flex items-center gap-1">
                            <Brain className="w-3.5 h-3.5 text-purple-500" />
                            <span className={`text-xs font-medium ${aiFlag === "Agrees" ? "text-emerald-600" : "text-orange-500"}`}>
                              {aiFlag}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={stage.class}>{stage.label}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {aiNeedsRun && (
                            <button
                              onClick={(e) => rerunEvaluation(e, c["Screening ID"])}
                              disabled={rerunning === c["Screening ID"]}
                              title="Run AI Evaluation"
                              className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-40"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${rerunning === c["Screening ID"] ? "animate-spin" : ""}`} />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
