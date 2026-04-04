"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

function OfferFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const screeningId = searchParams.get("screeningId") ?? "";

  const [candidate, setCandidate] = useState<Record<string, string> | null>(null);
  const [interviews, setInterviews] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    designation: "",
    finalCTC: "",
    doj: "",
    reportingManager: "",
    hikePercent: "",
    remarks: "",
    interviewSummary: "",
    docsComplete: true,
  });

  useEffect(() => {
    if (!screeningId) return;
    Promise.all([
      fetch(`/api/screening/${screeningId}`).then(r => r.json()),
      fetch(`/api/interviews?screeningId=${screeningId}`).then(r => r.json()),
    ]).then(([c, i]) => {
      setCandidate(c.candidate ?? null);
      setInterviews(i.interviews ?? []);
      if (c.candidate) {
        setForm(prev => ({
          ...prev,
          reportingManager: c.candidate["Reporting Manager"] ?? "",
        }));
      }
    });
  }, [screeningId]);

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, screeningId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Submission failed");
        return;
      }
      router.push("/dashboard/offers");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const interviewSummary = interviews
    .map(i => `${i["Interview for Round"]} (${i["Interviewed By"]}): ${i["Final Decision"]}`)
    .join(" | ");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Raise Offer Approval Request</h1>
          {candidate && (
            <p className="text-slate-500 text-sm mt-0.5">
              {screeningId} · {candidate["Candidate Name"]} · {candidate["Position Screened for"]}
            </p>
          )}
        </div>
      </div>

      {/* Candidate snapshot */}
      {candidate && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm grid grid-cols-2 gap-3">
          <div><p className="text-xs text-slate-500">Current CTC</p><p className="font-medium">{candidate["Current CTC (In Lakhs)"]} L</p></div>
          <div><p className="text-xs text-slate-500">Expected CTC</p><p className="font-medium">{candidate["Expected CTC (In Lakhs)"]} L</p></div>
          <div><p className="text-xs text-slate-500">Notice Period</p><p className="font-medium">{candidate["Notice Period"]}</p></div>
          <div><p className="text-xs text-slate-500">Experience</p><p className="font-medium">{candidate["Total Years of Experience"]}</p></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-700">Offer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Designation to be Offered" required value={form.designation} onChange={e => update("designation", e.target.value)} />
            <Input label="Final Negotiated CTC (Lakhs)" required value={form.finalCTC} onChange={e => update("finalCTC", e.target.value)} placeholder="e.g. 5.5" />
            <Input label="Date of Joining" type="date" required value={form.doj} onChange={e => update("doj", e.target.value)} />
            <Input label="Reporting Manager" value={form.reportingManager} onChange={e => update("reportingManager", e.target.value)} />
            <Input label="% Hike Given" value={form.hikePercent} onChange={e => update("hikePercent", e.target.value)} placeholder="e.g. 20%" />
          </div>
          <Textarea
            label="Interview Summary"
            rows={3}
            value={form.interviewSummary || interviewSummary}
            onChange={e => update("interviewSummary", e.target.value)}
            placeholder="Brief summary of all interview rounds…"
          />
          <Textarea label="Remarks" rows={2} value={form.remarks} onChange={e => update("remarks", e.target.value)} />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="docsComplete"
              checked={form.docsComplete}
              onChange={e => update("docsComplete", e.target.checked)}
              className="w-4 h-4 text-emerald-600"
            />
            <label htmlFor="docsComplete" className="text-sm text-slate-700">
              Document collection is complete and verified
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit for Management Approval"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewOfferPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}>
      <OfferFormInner />
    </Suspense>
  );
}
