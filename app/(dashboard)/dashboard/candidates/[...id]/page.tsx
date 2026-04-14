"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Brain, FileText, Phone, Mail, MapPin,
  Briefcase, ChevronDown, ChevronUp, Send, ExternalLink,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { decisionBadge, scoreBadgeClass, stageBadge } from "@/lib/utils";

interface Candidate extends Record<string, string> {}
interface Interview extends Record<string, string> {}

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string[] }> }) {
  const { id: idParts } = use(params);
  const id = idParts.map(p => decodeURIComponent(p)).join("/");
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [userRole, setUserRole] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  // Interview modal
  const [interviewModal, setInterviewModal] = useState(false);
  const [interviewType, setInterviewType] = useState<"platform" | "token">("token");
  const [iForm, setIForm] = useState({
    round: "Round 1",
    interviewDate: "",
    interviewMode: "Video Call",
    interviewLocation: "",
    interviewerName: "",
    interviewerEmail: "",
    feedback: "",
    decision: "",
    recordingUrl: "",
  });
  const [submittingInterview, setSubmittingInterview] = useState(false);
  const [tokenLink, setTokenLink] = useState("");

  // Document request
  const [requestingDocs, setRequestingDocs] = useState(false);

  // Move to interview queue
  const [movingToInterview, setMovingToInterview] = useState(false);

  const encodedId = encodeURIComponent(id); // id is decoded; re-encode for fetch URLs

  useEffect(() => {
    Promise.all([
      fetch(`/api/screening/${encodedId}`).then(r => r.json()),
      fetch(`/api/interviews?screeningId=${encodedId}`).then(r => r.json()),
      fetch("/api/auth/session").then(r => r.json()),
    ]).then(([cData, iData, sData]) => {
      setCandidate(cData.candidate ?? null);
      setInterviews(iData.interviews ?? []);
      setUserRole(sData.user?.role ?? "");
      setLoading(false);
    });
  }, [encodedId]);

  async function moveToInterview() {
    setMovingToInterview(true);
    await fetch(`/api/screening/${encodedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Stage: "INTERVIEW" }),
    });
    setCandidate(prev => prev ? { ...prev, Stage: "INTERVIEW" } : prev);
    setMovingToInterview(false);
  }

  async function submitInterview() {
    setSubmittingInterview(true);
    setTokenLink("");

    const body: Record<string, string> = {
      type: interviewType,
      screeningId: id,
      candidateName: candidate?.["Candidate Name"] ?? "",
      candidateEmail: candidate?.["Email Id"] ?? "",
      position: candidate?.["Position Screened for"] ?? "",
      round: iForm.round,
      interviewDate: iForm.interviewDate,
      interviewMode: iForm.interviewMode,
      interviewLocation: iForm.interviewLocation,
      interviewerName: iForm.interviewerName,
      interviewerEmail: iForm.interviewerEmail,
      feedback: iForm.feedback,
      decision: iForm.decision,
      recordingUrl: iForm.recordingUrl,
    };

    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.link) {
        // Token link generated — show it in modal instead of closing
        setTokenLink(data.link);
      } else {
        setInterviewModal(false);
        setIForm({ round: "Round 1", interviewDate: "", interviewMode: "Video Call", interviewLocation: "", interviewerName: "", interviewerEmail: "", feedback: "", decision: "", recordingUrl: "" });
      }
      const iData = await fetch(`/api/interviews?screeningId=${encodedId}`).then(r => r.json());
      setInterviews(iData.interviews ?? []);
    }
    setSubmittingInterview(false);
  }

  async function requestDocuments() {
    setRequestingDocs(true);
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "request", screeningId: id }),
    });
    setCandidate(prev => prev ? { ...prev, Stage: "DOCUMENTS" } : prev);
    setRequestingDocs(false);
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Loading candidate profile…</div>
    </div>
  );

  if (!candidate) return (
    <div className="p-6 text-slate-400">Candidate not found.</div>
  );

  const dec = decisionBadge(candidate["Overall Candidate Fit Assessment"]);
  const stage = stageBadge(candidate["Stage"]);
  const aiDone = candidate["AI Evaluation Status"] === "COMPLETED";
  // CHRO / developer account has full access to every action.
  const isFullAccess = ["CHRO", "TA_HEAD", "MANAGEMENT"].includes(userRole);
  const canViewSalary = isFullAccess;
  const canInterview = isFullAccess || userRole === "HR_SENIOR";
  const canRequestDocs = isFullAccess || ["HR_SENIOR", "HR_EXEC"].includes(userRole);
  const canRaiseOffer = isFullAccess;
  const docsStages = ["DOCUMENTS", "DOCUMENTS_SUBMITTED", "DOCUMENTS_VERIFIED"];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "ai", label: "AI Insights" },
    { id: "interviews", label: `Interviews (${interviews.length})` },
    ...(canViewSalary ? [{ id: "salary", label: "Salary & Offer" }] : []),
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{candidate["Candidate Name"]}</h1>
            <Badge className={stage.class}>{stage.label}</Badge>
            <Badge className={dec.class}>{dec.label}</Badge>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {candidate["Screening ID"]} · {candidate["Position Screened for"]}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {candidate["Stage"] === "SCREENED" && canInterview && (
          <Button onClick={moveToInterview} disabled={movingToInterview} variant="outline">
            {movingToInterview ? "Moving…" : "Move to Interview Queue"}
          </Button>
        )}
        {["SCREENED", "INTERVIEW"].includes(candidate["Stage"]) && canInterview && (
          <Button onClick={() => setInterviewModal(true)}>
            <Plus className="w-4 h-4" />
            Add Interview Round
          </Button>
        )}
        {canRequestDocs && !["REJECTED", "CLOSED"].includes(candidate["Stage"]) && (
          <Button variant="secondary" onClick={requestDocuments} disabled={requestingDocs}>
            <Send className="w-4 h-4" />
            {requestingDocs ? "Sending…" : "Send Document Collection Link"}
          </Button>
        )}
        {canRaiseOffer && docsStages.includes(candidate["Stage"]) && (
          <Button onClick={() => router.push(`/dashboard/offers/new?screeningId=${id}`)}>
            <FileText className="w-4 h-4" />
            Raise Offer Approval Request
          </Button>
        )}
        {candidate["Upload Resume:"] && (
          <a href={candidate["Upload Resume:"]} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" />
              View Resume
            </Button>
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.id
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact Details</h3>
            <div className="space-y-2 text-sm">
              {candidate["Phone Number"] && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {candidate["Phone Number"]}
                </div>
              )}
              {candidate["Email Id"] && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {candidate["Email Id"]}
                </div>
              )}
              {candidate["Job location?"] && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {candidate["Job location?"]}
                </div>
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Experience</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{candidate["Total Years of Experience"]} experience</span>
              </div>
              {candidate["Current Company Name, Designation, Working there since?"] && (
                <p className="text-slate-600">{candidate["Current Company Name, Designation, Working there since?"]}</p>
              )}
              {candidate["Highest Qualification"] && (
                <p className="text-slate-500 text-xs">{candidate["Highest Qualification"]}</p>
              )}
            </div>
          </div>

          {/* Skills */}
          {candidate["Key Skills"] && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Key Skills</h3>
              <div className="flex flex-wrap gap-2">
                {candidate["Key Skills"].split(",").map((s, i) => (
                  <Badge key={i} className="bg-slate-100 text-slate-600">{s.trim()}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Screening Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Screening Remarks</h3>
            <p className="text-sm text-slate-600">{candidate["Screening Remarks"] || "—"}</p>
            {candidate["Red flags ( if any )"] && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-xs font-semibold text-red-600 mb-1">Red Flags</p>
                <p className="text-xs text-red-700">{candidate["Red flags ( if any )"]}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="space-y-4">
          {!aiDone ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <Brain className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-700 font-medium">
                {candidate["AI Evaluation Status"] === "IN_PROGRESS"
                  ? "AI evaluation in progress…"
                  : candidate["AI Evaluation Status"] === "FAILED"
                  ? "AI evaluation failed"
                  : "AI evaluation pending — submit call recording to trigger"}
              </p>
              {candidate["AI Evaluation Status"] === "PENDING" && (
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await fetch(`/api/screening/${encodedId}/evaluate`, { method: "POST" });
                    window.location.reload();
                  }}
                >
                  Trigger Evaluation
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Scores */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Technical Score</p>
                  <p className={`text-3xl font-bold ${scoreBadgeClass(candidate["AI Technical Score"]).split(" ")[1]}`}>
                    {candidate["AI Technical Score"]}<span className="text-lg">/10</span>
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Culture Score</p>
                  <p className={`text-3xl font-bold ${scoreBadgeClass(candidate["AI Culture Score"]).split(" ")[1]}`}>
                    {candidate["AI Culture Score"]}<span className="text-lg">/10</span>
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">AI Validation</p>
                  <Badge className={candidate["AI Validation Flag"] === "Agrees" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                    {candidate["AI Validation Flag"]}
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">vs HR Decision</p>
                </div>
              </div>

              {/* AI Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                {candidate["AI Validation Reason"] && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Validation Reason</p>
                    <p className="text-sm text-slate-700">{candidate["AI Validation Reason"]}</p>
                  </div>
                )}
                {candidate["AI Strengths"] && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Strengths</p>
                    <p className="text-sm text-slate-700">{candidate["AI Strengths"]}</p>
                  </div>
                )}
                {candidate["AI Risk Flags"] && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Flags</p>
                    <p className="text-sm text-red-600">{candidate["AI Risk Flags"]}</p>
                  </div>
                )}
              </div>

              {/* Transcript */}
              {candidate["Call Transcript"] && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <button
                    className="flex items-center justify-between w-full"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    <p className="text-sm font-semibold text-slate-700">Call Transcript</p>
                    {showTranscript ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {showTranscript && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
                      {candidate["Call Transcript"]}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "interviews" && (
        <div className="space-y-4">
          {interviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No interview rounds yet</p>
              {canInterview && (
                <Button className="mt-3" size="sm" onClick={() => setInterviewModal(true)}>
                  Add First Round
                </Button>
              )}
            </div>
          ) : (
            interviews.map((iv, i) => {
              const ivDec = decisionBadge(iv["Final Decision"]);
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{iv["Interview for Round"]}</p>
                      <p className="text-xs text-slate-500">by {iv["Interviewed By"]} · {iv["Date (dd / mm /yy)"] || iv["Timestamp"]?.split(",")[0]}</p>
                    </div>
                    <Badge className={ivDec.class}>{ivDec.label}</Badge>
                  </div>
                  {iv["Interviewer Feedback"] && (
                    <p className="text-sm text-slate-600">{iv["Interviewer Feedback"]}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "salary" && canViewSalary && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Salary Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Current CTC</p>
              <p className="font-medium text-slate-800">{candidate["Current CTC (In Lakhs)"] || "—"} L</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Expected CTC</p>
              <p className="font-medium text-slate-800">{candidate["Expected CTC (In Lakhs)"] || "—"} L</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Notice Period</p>
              <p className="font-medium text-slate-800">{candidate["Notice Period"] || "—"}</p>
            </div>
          </div>
          {canRaiseOffer && docsStages.includes(candidate["Stage"]) && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button onClick={() => router.push(`/dashboard/offers/new?screeningId=${id}`)}>
                Raise Offer Approval Request
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Interview Modal */}
      <Modal
        open={interviewModal}
        onClose={() => { setInterviewModal(false); setTokenLink(""); }}
        title="Schedule Interview"
        size="md"
      >
        <div className="p-6 space-y-4">

          {/* Token sent success state */}
          {tokenLink ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Send className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-emerald-800">Interview link sent to {iForm.interviewerEmail}</p>
                <p className="text-xs text-emerald-600 mt-1">The interviewer can submit feedback without logging in</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">Token Link (copy as backup)</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={tokenLink}
                    className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(tokenLink)}
                    className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setInterviewModal(false); setTokenLink(""); setIForm({ round: "Round 1", interviewDate: "", interviewMode: "Video Call", interviewLocation: "", interviewerName: "", interviewerEmail: "", feedback: "", decision: "", recordingUrl: "" }); }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setInterviewType("token")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    interviewType === "token" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Send Token Link
                </button>
                <button
                  onClick={() => setInterviewType("platform")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    interviewType === "platform" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Log on Platform
                </button>
              </div>

              {/* Common fields */}
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Interview Round"
                  required
                  value={iForm.round}
                  onChange={(e) => setIForm(prev => ({ ...prev, round: e.target.value }))}
                  options={["Round 1", "Round 2", "Round 3", "Technical Evaluation", "CV Evaluation", "JD Evaluation", "General Discussion"].map(r => ({ value: r, label: r }))}
                />
                <Select
                  label="Mode"
                  value={iForm.interviewMode}
                  onChange={(e) => setIForm(prev => ({ ...prev, interviewMode: e.target.value }))}
                  options={["Video Call", "In Person", "Phone Call", "Panel"].map(m => ({ value: m, label: m }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Interview Date"
                  type="date"
                  value={iForm.interviewDate}
                  onChange={(e) => setIForm(prev => ({ ...prev, interviewDate: e.target.value }))}
                />
                <Input
                  label="Location / Link"
                  value={iForm.interviewLocation}
                  placeholder="Office / Meet link"
                  onChange={(e) => setIForm(prev => ({ ...prev, interviewLocation: e.target.value }))}
                />
              </div>

              {/* Token-specific */}
              {interviewType === "token" && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Interviewer Details — a secure link will be emailed, no login needed</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Interviewer Name"
                      required
                      value={iForm.interviewerName}
                      onChange={(e) => setIForm(prev => ({ ...prev, interviewerName: e.target.value }))}
                    />
                    <Input
                      label="Interviewer Email"
                      type="email"
                      required
                      value={iForm.interviewerEmail}
                      onChange={(e) => setIForm(prev => ({ ...prev, interviewerEmail: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Platform-specific */}
              {interviewType === "platform" && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <Input
                    label="Interviewer Name"
                    value={iForm.interviewerName}
                    onChange={(e) => setIForm(prev => ({ ...prev, interviewerName: e.target.value }))}
                  />
                  <Textarea
                    label="Interviewer Feedback"
                    rows={3}
                    required
                    value={iForm.feedback}
                    onChange={(e) => setIForm(prev => ({ ...prev, feedback: e.target.value }))}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Final Decision <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      {["Proceed", "Hold", "Reject"].map(d => (
                        <button
                          key={d}
                          onClick={() => setIForm(prev => ({ ...prev, decision: d }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            iForm.decision === d
                              ? d === "Proceed" ? "bg-emerald-600 text-white border-emerald-600"
                              : d === "Hold" ? "bg-yellow-500 text-white border-yellow-500"
                              : "bg-red-600 text-white border-red-600"
                              : "border-slate-300 text-slate-600"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={submitInterview}
                disabled={
                  submittingInterview ||
                  (interviewType === "platform" && !iForm.decision) ||
                  (interviewType === "token" && (!iForm.interviewerEmail || !iForm.interviewerName))
                }
              >
                {submittingInterview
                  ? "Scheduling…"
                  : interviewType === "token"
                  ? "Send Interview Link"
                  : "Schedule & Log Interview"}
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
