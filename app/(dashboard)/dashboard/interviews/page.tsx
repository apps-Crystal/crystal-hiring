"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { decisionBadge } from "@/lib/utils";

interface Interview extends Record<string, string> {}

export default function InterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");

  useEffect(() => {
    fetch("/api/interviews")
      .then(r => r.json())
      .then(d => {
        setInterviews(d.interviews ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = interviews.filter(iv => {
    const q = search.toLowerCase();
    if (search && !(
      iv["Candidate Name (Auto)"]?.toLowerCase().includes(q) ||
      iv["Screening ID (Auto)"]?.toLowerCase().includes(q) ||
      iv["Position Screened For (Auto)"]?.toLowerCase().includes(q)
    )) return false;
    if (roundFilter && iv["Interview for Round"] !== roundFilter) return false;
    if (decisionFilter && iv["Final Decision"] !== decisionFilter) return false;
    return true;
  });

  const rounds = [...new Set(interviews.map(i => i["Interview for Round"]).filter(Boolean))];
  const decisions = [...new Set(interviews.map(i => i["Final Decision"]).filter(Boolean))];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Rounds</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} interview records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search candidate or position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={roundFilter} onChange={e => setRoundFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Rounds</option>
          {rounds.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={decisionFilter} onChange={e => setDecisionFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Decisions</option>
          {decisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidate</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Position</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Round</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Interviewer</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Decision</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No interview records
                </td>
              </tr>
            ) : (
              filtered.map((iv, i) => {
                const dec = decisionBadge(iv["Final Decision"]);
                return (
                  <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/dashboard/candidates/${iv["Screening ID (Auto)"]}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{iv["Candidate Name (Auto)"] || "—"}</p>
                      <p className="text-xs text-slate-400 font-mono">{iv["Screening ID (Auto)"]}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{iv["Position Screened For (Auto)"] || "—"}</td>
                    <td className="px-4 py-3"><Badge className="bg-purple-100 text-purple-700">{iv["Interview for Round"] || "—"}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{iv["Interviewed By"] || "—"}</td>
                    <td className="px-4 py-3"><Badge className={dec.class}>{dec.label || "—"}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{iv["Date (dd / mm /yy)"] || iv["Timestamp"]?.split(",")[0]}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
