"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface Stats {
  totalRequisitions: number;
  openRequisitions: number;
  pendingApproval: number;
  totalCandidates: number;
  shortlisted: number;
  inInterview: number;
  inDocuments: number;
  offerStage: number;
  accepted: number;
  totalInterviews: number;
  totalOffers: number;
  pendingOffers: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/requisitions").then(r => r.json()),
      fetch("/api/screening").then(r => r.json()),
      fetch("/api/interviews").then(r => r.json()),
      fetch("/api/offers").then(r => r.json()),
    ]).then(([reqs, candidates, interviews, offers]) => {
      const rList = reqs.requisitions ?? [];
      const cList = candidates.candidates ?? [];
      const iList = interviews.interviews ?? [];
      const oList = offers.offers ?? [];

      setStats({
        totalRequisitions: rList.length,
        openRequisitions: rList.filter((r: Record<string, string>) => r["Requisition Status"] === "OPEN").length,
        pendingApproval: rList.filter((r: Record<string, string>) => r["Requisition Status"] === "PENDING_APPROVAL").length,
        totalCandidates: cList.length,
        shortlisted: cList.filter((c: Record<string, string>) => c["Overall Candidate Fit Assessment"] === "Shortlisted").length,
        inInterview: cList.filter((c: Record<string, string>) => c["Stage"] === "INTERVIEW").length,
        inDocuments: cList.filter((c: Record<string, string>) => c["Stage"] === "DOCUMENTS").length,
        offerStage: cList.filter((c: Record<string, string>) => c["Stage"] === "OFFER").length,
        accepted: cList.filter((c: Record<string, string>) => c["Stage"] === "ACCEPTED").length,
        totalInterviews: iList.length,
        totalOffers: oList.length,
        pendingOffers: oList.filter((o: Record<string, string>) => o["Offer Request Status"] === "PENDING_APPROVAL").length,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading reports…</div>;
  if (!stats) return null;

  const statCards = [
    { label: "Total Requisitions", value: stats.totalRequisitions, sub: `${stats.openRequisitions} open`, icon: <FileText className="w-5 h-5" />, color: "bg-blue-100 text-blue-600" },
    { label: "Pending Approval", value: stats.pendingApproval, sub: "Requisitions awaiting decision", icon: <Clock className="w-5 h-5" />, color: "bg-yellow-100 text-yellow-600" },
    { label: "Total Candidates", value: stats.totalCandidates, sub: `${stats.shortlisted} shortlisted`, icon: <Users className="w-5 h-5" />, color: "bg-emerald-100 text-emerald-600" },
    { label: "In Interview", value: stats.inInterview, sub: "Active interview stage", icon: <BarChart3 className="w-5 h-5" />, color: "bg-purple-100 text-purple-600" },
    { label: "In Document Stage", value: stats.inDocuments, sub: "Awaiting document verification", icon: <FileText className="w-5 h-5" />, color: "bg-orange-100 text-orange-600" },
    { label: "Offer Stage", value: stats.offerStage, sub: `${stats.pendingOffers} pending approval`, icon: <TrendingUp className="w-5 h-5" />, color: "bg-cyan-100 text-cyan-600" },
    { label: "Accepted", value: stats.accepted, sub: "Offer accepted", icon: <CheckCircle className="w-5 h-5" />, color: "bg-green-100 text-green-600" },
    { label: "Total Interviews", value: stats.totalInterviews, sub: "Interview rounds logged", icon: <BarChart3 className="w-5 h-5" />, color: "bg-indigo-100 text-indigo-600" },
  ];

  // Conversion rates
  const conversionRate = stats.totalCandidates > 0
    ? ((stats.accepted / stats.totalCandidates) * 100).toFixed(1)
    : "0.0";

  const shortlistRate = stats.totalCandidates > 0
    ? ((stats.shortlisted / stats.totalCandidates) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Hiring pipeline metrics and performance overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Hiring Funnel</h2>
        <div className="space-y-3">
          {[
            { stage: "Screened", value: stats.totalCandidates, color: "bg-blue-400" },
            { stage: "Shortlisted", value: stats.shortlisted, color: "bg-emerald-400" },
            { stage: "Interview", value: stats.inInterview, color: "bg-purple-400" },
            { stage: "Documents", value: stats.inDocuments, color: "bg-orange-400" },
            { stage: "Offer", value: stats.offerStage, color: "bg-cyan-400" },
            { stage: "Accepted", value: stats.accepted, color: "bg-green-500" },
          ].map(({ stage, value, color }) => {
            const pct = stats.totalCandidates > 0 ? (value / stats.totalCandidates) * 100 : 0;
            return (
              <div key={stage} className="flex items-center gap-3">
                <p className="text-sm text-slate-600 w-24 shrink-0">{stage}</p>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-slate-700 w-8 text-right">{value}</p>
                <p className="text-xs text-slate-400 w-10">{pct.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-4xl font-bold text-emerald-600">{shortlistRate}%</p>
          <p className="text-sm text-slate-600 mt-1">Shortlist Rate</p>
          <p className="text-xs text-slate-400">of total screened candidates</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-4xl font-bold text-blue-600">{conversionRate}%</p>
          <p className="text-sm text-slate-600 mt-1">Offer Conversion Rate</p>
          <p className="text-xs text-slate-400">screened to accepted</p>
        </div>
      </div>
    </div>
  );
}
