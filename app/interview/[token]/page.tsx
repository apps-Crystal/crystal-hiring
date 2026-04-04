"use client";

import { useEffect, useState, use } from "react";
import { Brain, User, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { scoreBadgeClass } from "@/lib/utils";

interface TokenData {
  payload: { screeningId: string; interviewerName: string; round: string };
  candidate: { name: string; position: string; experience: string; aiTechScore: string; aiCultureScore: string };
  priorRounds: { round: string; interviewedBy: string; feedback: string; decision: string; date: string }[];
}

export default function InterviewTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState("");

  useEffect(() => {
    fetch(`/api/interviews/token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load interview form.");
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!decision) return;
    setSubmitting(true);

    const res = await fetch("/api/interviews/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, feedback, decision }),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      setError("Submission failed. Please try again.");
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading interview form…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl">!</span>
        </div>
        <h2 className="font-semibold text-slate-800 mb-2">Invalid Link</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <p className="text-xs text-slate-400 mt-4">If you believe this is an error, please contact the HR team.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="font-semibold text-slate-800 mb-2">Feedback Submitted</h2>
        <p className="text-sm text-slate-500">
          Thank you, {data?.payload.interviewerName}! Your interview feedback has been recorded successfully.
        </p>
        <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-slate-900 rounded-2xl px-6 py-5 mb-6 text-white">
          <p className="text-slate-400 text-xs mb-1">Crystal Group — Interview Feedback Form</p>
          <h1 className="text-xl font-bold">{data?.payload.round}</h1>
          <p className="text-slate-300 text-sm mt-1">
            Interviewer: {data?.payload.interviewerName}
          </p>
        </div>

        {/* Candidate Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">{data?.candidate.name}</h2>
              <p className="text-slate-500 text-sm">{data?.candidate.position}</p>
              <p className="text-slate-400 text-xs mt-0.5">{data?.candidate.experience} experience</p>
            </div>
          </div>

          {/* AI Scores */}
          {(data?.candidate.aiTechScore || data?.candidate.aiCultureScore) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-semibold text-slate-600">AI Screening Scores</p>
              </div>
              <div className="flex gap-3">
                {data?.candidate.aiTechScore && (
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Technical</p>
                    <Badge className={scoreBadgeClass(data.candidate.aiTechScore)}>
                      {data.candidate.aiTechScore}/10
                    </Badge>
                  </div>
                )}
                {data?.candidate.aiCultureScore && (
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Culture Fit</p>
                    <Badge className={scoreBadgeClass(data.candidate.aiCultureScore)}>
                      {data.candidate.aiCultureScore}/10
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prior Rounds */}
        {data?.priorRounds && data.priorRounds.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Prior Interview Rounds</h3>
            <div className="space-y-3">
              {data.priorRounds.map((r, i) => (
                <div key={i} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-xs font-semibold text-slate-600">{r.round} — {r.interviewedBy}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.feedback}</p>
                  <Badge className={
                    r.decision === "Proceed" ? "bg-green-100 text-green-700"
                    : r.decision === "Hold" ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                  }>
                    {r.decision}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-700">Your Feedback</h3>

          <Textarea
            label="Interview Notes & Observations"
            required
            rows={6}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe the candidate's responses, strengths, concerns, and overall impression…"
          />

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Final Decision <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {["Proceed", "Hold", "Reject"].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDecision(d)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    decision === d
                      ? d === "Proceed" ? "bg-emerald-600 text-white border-emerald-600"
                      : d === "Hold" ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-red-600 text-white border-red-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !decision || !feedback.trim()}
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </Button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-6">
          Crystal Group Logistics Cool Chain Ltd. · Confidential
        </p>
      </div>
    </div>
  );
}
