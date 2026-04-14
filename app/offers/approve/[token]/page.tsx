"use client";

import { useEffect, useState, use } from "react";
import { CheckCircle2, AlertCircle, CheckCircle, XCircle, PauseCircle } from "lucide-react";

interface ApprovalData {
  screeningId: string;
  candidateName: string;
  position: string;
  offer: {
    designation: string;
    currentCTC: string;
    expectedCTC: string;
    finalCTC: string;
    doj: string;
    location: string;
    reportingManager: string;
    interviewFeedback: string;
    hikePercent: string;
    remarks: string;
    status: string;
  };
  candidate: {
    experience: string;
    noticePeriod: string;
    currentCompany: string;
    aiTechScore: string;
    aiCultureScore: string;
  };
  interviews: { round: string; interviewer: string; decision: string; feedback: string; date: string }[];
}

export default function OfferApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "HOLD" | "">("");
  const [approvedCTC, setApprovedCTC] = useState("");
  const [remarks, setRemarks] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverDesignation, setApproverDesignation] = useState("");

  useEffect(() => {
    fetch(`/api/offers/public/approve/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setData(d);
          setApprovedCTC(d.offer.finalCTC ?? "");
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [token]);

  async function handleSubmit() {
    if (!decision) { setError("Please choose a decision"); return; }
    if (!approverName) { setError("Please enter your name"); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/offers/public/approve/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, approvedCTC, remarks, approverName, approverDesignation }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) setSubmitted(decision);
    else setError(d.error ?? "Failed");
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading offer…</div>;

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Link Invalid or Expired</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-emerald-200 p-8 max-w-md text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Decision Recorded: {submitted}</h1>
          <p className="text-sm text-slate-500">Crystal Group HR has been notified and will proceed accordingly.</p>
        </div>
      </div>
    );
  }

  if (data?.offer.status && data.offer.status !== "PENDING_APPROVAL") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <CheckCircle2 className="w-14 h-14 text-slate-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Already {data.offer.status}</h1>
          <p className="text-sm text-slate-500">This offer has already been reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">Offer Approval Request</h1>
          <p className="text-slate-300 text-sm mt-1">Crystal Group Hiring System · Candidate: {data?.candidateName}</p>
        </div>

        <div className="bg-white rounded-b-xl border border-slate-200 p-6 space-y-6">
          {/* Candidate snapshot */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Candidate Snapshot</h2>
            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-xl p-4">
              <div><p className="text-xs text-slate-500">Screening ID</p><p className="font-mono text-slate-800">{data?.screeningId}</p></div>
              <div><p className="text-xs text-slate-500">Position</p><p className="text-slate-800">{data?.position}</p></div>
              <div><p className="text-xs text-slate-500">Experience</p><p className="text-slate-800">{data?.candidate.experience}</p></div>
              <div><p className="text-xs text-slate-500">Notice Period</p><p className="text-slate-800">{data?.candidate.noticePeriod || "—"}</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-500">Current Company</p><p className="text-slate-800">{data?.candidate.currentCompany || "—"}</p></div>
              <div><p className="text-xs text-slate-500">AI Technical Score</p><p className="text-slate-800">{data?.candidate.aiTechScore || "—"}/10</p></div>
              <div><p className="text-xs text-slate-500">AI Culture Score</p><p className="text-slate-800">{data?.candidate.aiCultureScore || "—"}/10</p></div>
            </div>
          </section>

          {/* Interview rounds */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Interview Rounds ({data?.interviews.length ?? 0})</h2>
            <div className="space-y-2">
              {data?.interviews.length === 0 ? (
                <p className="text-sm text-slate-400">No interview records</p>
              ) : (
                data?.interviews.map((iv, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800">{iv.round} · {iv.interviewer}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        iv.decision === "Proceed" ? "bg-emerald-100 text-emerald-700" :
                        iv.decision === "Reject" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{iv.decision || "—"}</span>
                    </div>
                    {iv.feedback && <p className="text-xs text-slate-600">{iv.feedback}</p>}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Offer terms */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Proposed Offer Terms</h2>
            <div className="grid grid-cols-2 gap-3 text-sm bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div><p className="text-xs text-slate-500">Designation</p><p className="text-slate-800 font-medium">{data?.offer.designation}</p></div>
              <div><p className="text-xs text-slate-500">Location</p><p className="text-slate-800">{data?.offer.location || "—"}</p></div>
              <div><p className="text-xs text-slate-500">Current CTC</p><p className="text-slate-800">{data?.offer.currentCTC} L</p></div>
              <div><p className="text-xs text-slate-500">Expected CTC</p><p className="text-slate-800">{data?.offer.expectedCTC} L</p></div>
              <div><p className="text-xs text-slate-500">Final CTC</p><p className="text-emerald-800 font-bold">{data?.offer.finalCTC} L</p></div>
              <div><p className="text-xs text-slate-500">% Hike</p><p className="text-slate-800">{data?.offer.hikePercent || "—"}</p></div>
              <div><p className="text-xs text-slate-500">Date of Joining</p><p className="text-slate-800">{data?.offer.doj}</p></div>
              <div><p className="text-xs text-slate-500">Reporting Manager</p><p className="text-slate-800">{data?.offer.reportingManager || "—"}</p></div>
            </div>
            {data?.offer.remarks && (
              <p className="text-xs text-slate-600 mt-2"><strong>TA Head Remarks:</strong> {data.offer.remarks}</p>
            )}
          </section>

          {/* Decision */}
          <section className="pt-2 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Your Decision</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["APPROVED", "HOLD", "REJECTED"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDecision(d)}
                  className={`py-3 rounded-xl border-2 font-medium text-sm transition-colors ${
                    decision === d
                      ? d === "APPROVED" ? "bg-emerald-600 text-white border-emerald-600"
                      : d === "HOLD" ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-red-600 text-white border-red-600"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {d === "APPROVED" ? <CheckCircle className="w-4 h-4 inline mr-1" /> :
                   d === "REJECTED" ? <XCircle className="w-4 h-4 inline mr-1" /> :
                   <PauseCircle className="w-4 h-4 inline mr-1" />}
                  {d}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {decision === "APPROVED" && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Approved CTC (Lakhs)</label>
                  <input
                    value={approvedCTC}
                    onChange={e => setApprovedCTC(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Your Name <span className="text-red-500">*</span></label>
                  <input
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Designation</label>
                  <input
                    value={approverDesignation}
                    onChange={e => setApproverDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="e.g. Director"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Remarks</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={submitting || !decision || !approverName}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : `Confirm ${decision || "Decision"}`}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
