"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ClipboardList, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { decisionBadge } from "@/lib/utils";

interface ScreeningRecord extends Record<string, string> {}

export default function ScreeningPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/screening")
      .then(r => r.json())
      .then(d => {
        setRecords(d.candidates ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r["Candidate Name"]?.toLowerCase().includes(q) ||
      r["Screening ID"]?.toLowerCase().includes(q) ||
      r["Position Screened for"]?.toLowerCase().includes(q) ||
      r["Requisition Id"]?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Candidate Screening</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} records</p>
        </div>
        <Link href="/dashboard/screening/new">
          <Button>
            <Plus className="w-4 h-4" />
            Screen New Candidate
          </Button>
        </Link>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Search candidate, position, screening ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidate</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Position</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Req ID</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Decision</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">AI Status</th>
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
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No screening records
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const dec = decisionBadge(r["Overall Candidate Fit Assessment"]);
                const aiStatus = r["AI Evaluation Status"];
                return (
                  <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/dashboard/candidates/${r["Screening ID"]}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r["Candidate Name"] || "—"}</p>
                      <p className="text-xs text-slate-400 font-mono">{r["Screening ID"]}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r["Position Screened for"] || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">{r["Requisition Id"] || "—"}</td>
                    <td className="px-4 py-3"><Badge className={dec.class}>{dec.label || "—"}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={
                        aiStatus === "COMPLETED" ? "bg-green-100 text-green-700"
                        : aiStatus === "IN_PROGRESS" ? "bg-blue-100 text-blue-700"
                        : aiStatus === "FAILED" ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                      }>
                        {aiStatus === "COMPLETED" ? "Done" : aiStatus === "IN_PROGRESS" ? "Running" : aiStatus === "FAILED" ? "Failed" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r["Date"] || r["Timestamp"]?.split(",")[0]}</td>
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
