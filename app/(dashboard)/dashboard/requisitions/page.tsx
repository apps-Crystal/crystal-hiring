"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, MapPin, Users, Calendar, ChevronRight, Search, Filter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ScreeningFormModal } from "@/components/ScreeningFormModal";
import { requisitionStatusBadge, formatDate } from "@/lib/utils";

interface Requisition {
  "Requisition Id": string;
  "Position Title": string;
  "Department": string;
  "Job Type": string;
  "Total Nos Required": string;
  "Location": string;
  "Reporting Manager": string;
  "Required Years of Experience": string;
  "Salary Range": string;
  "Preferred Joining Date": string;
  "Requisition Status": string;
  "Approved By": string;
  "Approval Remarks": string;
  "Raised By": string;
  "Timestamp": string;
  "AI Question 1": string;
  "AI Question 2": string;
  "AI Question 3": string;
  "Core Responsibilities of the Position": string;
  "Key Skills Required": string;
  "screening prefilled form link": string;
  [key: string]: string;
}

interface ApprovalModalState {
  open: boolean;
  reqId: string;
  position: string;
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [approvalModal, setApprovalModal] = useState<ApprovalModalState>({ open: false, reqId: "", position: "" });
  const [approvalDecision, setApprovalDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [approving, setApproving] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [screeningReq, setScreeningReq] = useState<Requisition | null>(null);

  const fetchRequisitions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (deptFilter) params.set("dept", deptFilter);

    const res = await fetch(`/api/requisitions?${params}`);
    const data = await res.json();
    setRequisitions(data.requisitions ?? []);
    setLoading(false);
  }, [statusFilter, deptFilter]);

  useEffect(() => {
    fetchRequisitions();
    fetch("/api/auth/session").then(r => r.json()).then(d => setUserRole(d.user?.role ?? ""));
  }, [fetchRequisitions]);

  const filtered = requisitions.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r["Position Title"]?.toLowerCase().includes(q) ||
      r["Department"]?.toLowerCase().includes(q) ||
      r["Requisition Id"]?.toLowerCase().includes(q)
    );
  });

  const departments = [...new Set(requisitions.map((r) => r["Department"]).filter(Boolean))];
  const canApprove = ["CHRO", "TA_HEAD"].includes(userRole);

  async function handleApprove() {
    setApproving(true);
    const res = await fetch(`/api/requisitions/${approvalModal.reqId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: approvalDecision, remarks: approvalRemarks }),
    });
    if (res.ok) {
      setApprovalModal({ open: false, reqId: "", position: "" });
      setApprovalRemarks("");
      fetchRequisitions();
    }
    setApproving(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Job Requisitions</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} requisitions</p>
        </div>
        <Link href="/dashboard/requisitions/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Requisition
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search by position, dept, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="OPEN">Open</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <Button variant="ghost" onClick={fetchRequisitions}>
          <Filter className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No requisitions found</p>
          <p className="text-sm mt-1">Create a new requisition to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((req) => {
            const badge = requisitionStatusBadge(req["Requisition Status"]);
            return (
              <div
                key={req["Requisition Id"]}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedReq(req)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-mono">{req["Requisition Id"]}</p>
                    <h3 className="font-semibold text-slate-800 text-base mt-0.5 leading-snug">
                      {req["Position Title"]}
                    </h3>
                  </div>
                  <Badge className={badge.class}>{badge.label}</Badge>
                </div>

                {/* Meta */}
                <div className="space-y-1.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{req["Department"]}</span>
                    {req["Job Type"] && (
                      <Badge className="bg-slate-100 text-slate-600">{req["Job Type"]}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {req["Location"] && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {req["Location"]}
                      </span>
                    )}
                    {req["Total Nos Required"] && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {req["Total Nos Required"]} opening{req["Total Nos Required"] !== "1" ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {req["Required Years of Experience"] && (
                    <p className="text-xs">{req["Required Years of Experience"]} experience</p>
                  )}
                </div>

                {/* AI Questions indicator */}
                {req["AI Question 1"] && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    3 AI questions generated
                  </div>
                )}

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(req["Timestamp"]?.split(",")[0] ?? "")}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Requisition Detail Modal */}
      {selectedReq && (
        <Modal
          open={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`${selectedReq["Requisition Id"]} — ${selectedReq["Position Title"]}`}
          size="xl"
        >
          <div className="p-6">
            {/* Status + Actions */}
            <div className="flex items-center gap-3 mb-6">
              <Badge className={requisitionStatusBadge(selectedReq["Requisition Status"]).class}>
                {requisitionStatusBadge(selectedReq["Requisition Status"]).label}
              </Badge>
              {canApprove && selectedReq["Requisition Status"] === "PENDING_APPROVAL" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedReq(null);
                    setApprovalModal({
                      open: true,
                      reqId: selectedReq["Requisition Id"],
                      position: selectedReq["Position Title"],
                    });
                  }}
                >
                  Review & Decide
                </Button>
              )}
              {selectedReq["Requisition Status"] !== "REJECTED" && selectedReq["Requisition Status"] !== "CLOSED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSelectedReq(null); setScreeningReq(selectedReq); }}
                >
                  Screen Candidate
                </Button>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: "Department", val: selectedReq["Department"] },
                { label: "Job Type", val: selectedReq["Job Type"] },
                { label: "Location", val: selectedReq["Location"] },
                { label: "Openings", val: selectedReq["Total Nos Required"] },
                { label: "Experience", val: selectedReq["Required Years of Experience"] },
                { label: "Salary Range", val: selectedReq["Salary Range"] },
                { label: "Reporting To", val: selectedReq["Reporting Manager"] },
                { label: "Raised By", val: selectedReq["Raised By"] },
                { label: "Preferred DOJ", val: formatDate(selectedReq["Preferred Joining Date"]) },
              ].map(({ label, val }) =>
                val ? (
                  <div key={label}>
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{val}</p>
                  </div>
                ) : null
              )}
            </div>

            {/* Key Skills */}
            {selectedReq["Key Skills Required"] && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Skills</p>
                <p className="text-sm text-slate-700">{selectedReq["Key Skills Required"]}</p>
              </div>
            )}

            {/* Responsibilities */}
            {selectedReq["Core Responsibilities of the Position"] && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Core Responsibilities
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedReq["Core Responsibilities of the Position"]}
                </p>
              </div>
            )}

            {/* AI Questions */}
            {selectedReq["AI Question 1"] && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">AI-Generated Screening Questions</p>
                </div>
                <div className="space-y-2">
                  {["AI Question 1", "AI Question 2", "AI Question 3"].map((qKey, i) =>
                    selectedReq[qKey] ? (
                      <div key={qKey} className="flex gap-2">
                        <span className="text-emerald-600 font-bold text-sm shrink-0">Q{i + 1}.</span>
                        <p className="text-sm text-slate-700">{selectedReq[qKey]}</p>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Approval info */}
            {selectedReq["Approved By"] && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-500">
                  Decision by <strong>{selectedReq["Approved By"]}</strong>
                  {selectedReq["Approval Remarks"] && ` — "${selectedReq["Approval Remarks"]}"`}
                </p>
              </div>
            )}

            {/* Screening Link */}
            {selectedReq["Requisition Status"] !== "REJECTED" && selectedReq["Requisition Status"] !== "CLOSED" && (
              <div className="mt-4">
                <Button
                  className="w-full"
                  onClick={() => { setSelectedReq(null); setScreeningReq(selectedReq); }}
                >
                  Start Screening for this Role
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Screening Form Modal */}
      {screeningReq && (
        <ScreeningFormModal
          open={!!screeningReq}
          requisition={screeningReq}
          onClose={() => setScreeningReq(null)}
          onSuccess={() => {
            setScreeningReq(null);
            fetchRequisitions();
          }}
        />
      )}

      {/* Approval Modal */}
      <Modal
        open={approvalModal.open}
        onClose={() => setApprovalModal({ open: false, reqId: "", position: "" })}
        title={`Approve / Reject — ${approvalModal.position}`}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setApprovalDecision("APPROVED")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                approvalDecision === "APPROVED"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-slate-300 text-slate-600 hover:border-emerald-400"
              }`}
            >
              Approve
            </button>
            <button
              onClick={() => setApprovalDecision("REJECTED")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                approvalDecision === "REJECTED"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-slate-300 text-slate-600 hover:border-red-400"
              }`}
            >
              Reject
            </button>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Remarks {approvalDecision === "REJECTED" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              rows={3}
              placeholder="Add remarks…"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button
            onClick={handleApprove}
            disabled={approving || (approvalDecision === "REJECTED" && !approvalRemarks.trim())}
            className="w-full"
            variant={approvalDecision === "REJECTED" ? "danger" : "primary"}
          >
            {approving ? "Processing…" : `Confirm ${approvalDecision === "APPROVED" ? "Approval" : "Rejection"}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
