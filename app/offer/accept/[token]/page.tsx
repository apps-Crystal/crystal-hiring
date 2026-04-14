"use client";

import { useEffect, useState, use } from "react";
import { CheckCircle2, AlertCircle, FileText, Download, Upload } from "lucide-react";

interface OfferInfo {
  screeningId: string;
  candidateName: string;
  position: string;
  email: string;
  phone: string;
  offerLetterUrl: string;
  doj: string;
  hiringLocation: string;
  finalSalary: string;
}

export default function OfferAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [info, setInfo] = useState<OfferInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"accept" | "decline" | null>(null);

  const [decision, setDecision] = useState<"accept" | "decline" | "">("");
  const [form, setForm] = useState({ fullName: "", contact: "", doj: "", email: "" });
  const [signedOffer, setSignedOffer] = useState<File | null>(null);
  const [resignation, setResignation] = useState<File | null>(null);

  useEffect(() => {
    fetch(`/api/offers/public/accept/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setInfo(d);
          setForm({
            fullName: d.candidateName ?? "",
            contact: d.phone ?? "",
            doj: d.doj ?? "",
            email: d.email ?? "",
          });
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load offer"); setLoading(false); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!decision) { setError("Please choose accept or decline"); return; }
    if (decision === "accept" && !signedOffer) {
      setError("Please upload the signed offer letter"); return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("decision", decision);
    fd.append("fullName", form.fullName);
    fd.append("contact", form.contact);
    fd.append("doj", form.doj);
    fd.append("email", form.email);
    if (signedOffer) fd.append("signedOffer", signedOffer);
    if (resignation) fd.append("resignation", resignation);

    const res = await fetch(`/api/offers/public/accept/${token}`, { method: "POST", body: fd });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) setSubmitted(decision);
    else setError(data.error ?? "Submission failed");
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading…</div>;
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-emerald-200 p-8 max-w-md text-center">
          <CheckCircle2 className={`w-14 h-14 ${submitted === "accept" ? "text-emerald-500" : "text-slate-400"} mx-auto mb-3`} />
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            {submitted === "accept" ? "Offer Accepted!" : "Offer Declined"}
          </h1>
          <p className="text-sm text-slate-500">
            {submitted === "accept"
              ? "Thank you! Our HR team will be in touch with next steps for onboarding."
              : "Thank you for letting us know. We wish you the best in your future endeavours."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">Crystal Group — Offer Letter</h1>
          <p className="text-slate-300 text-sm mt-1">Position: {info?.position}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-b-xl border border-slate-200 p-6 space-y-6">
          <p className="text-sm text-slate-600">
            Dear <strong>{info?.candidateName}</strong>, we are pleased to extend you an offer to join Crystal Group.
          </p>

          {/* Offer summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Designation</span><span className="font-medium text-slate-800">{info?.position}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium text-slate-800">{info?.hiringLocation || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Final CTC (per annum)</span><span className="font-medium text-slate-800">₹ {info?.finalSalary || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date of Joining</span><span className="font-medium text-slate-800">{info?.doj || "—"}</span></div>
          </div>

          {/* Download offer letter */}
          <a
            href={info?.offerLetterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border-2 border-emerald-500 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Download className="w-5 h-5 text-emerald-600" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">Download Your Offer Letter</p>
              <p className="text-xs text-emerald-600">Review the full offer letter before responding</p>
            </div>
          </a>

          {/* Decision */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Your Decision</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("accept")}
                className={`py-4 rounded-xl border-2 font-medium transition-colors ${
                  decision === "accept" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300 text-slate-600 hover:border-emerald-400"
                }`}
              >
                Accept Offer
              </button>
              <button
                type="button"
                onClick={() => setDecision("decline")}
                className={`py-4 rounded-xl border-2 font-medium transition-colors ${
                  decision === "decline" ? "bg-red-600 text-white border-red-600" : "border-slate-300 text-slate-600 hover:border-red-400"
                }`}
              >
                Decline Offer
              </button>
            </div>
          </div>

          {decision === "accept" && (
            <>
              {/* Personal details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" value={form.fullName} onChange={v => setForm(p => ({ ...p, fullName: v }))} required />
                <Field label="Contact Number" value={form.contact} onChange={v => setForm(p => ({ ...p, contact: v }))} required />
                <Field label="Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} required />
                <Field label="Confirm Date of Joining" type="date" value={form.doj} onChange={v => setForm(p => ({ ...p, doj: v }))} required />
              </div>

              {/* Uploads */}
              <FileField
                label="Upload Signed Offer Letter"
                file={signedOffer}
                onChange={setSignedOffer}
                required
              />
              <FileField
                label="Upload Proof of Resignation from Previous Employer (if applicable)"
                file={resignation}
                onChange={setResignation}
              />
              <p className="text-xs text-slate-400">PDF, JPG, or PNG • max 10MB each</p>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !decision}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : decision === "accept" ? "Accept Offer & Submit Documents" : decision === "decline" ? "Submit Decline" : "Choose Accept or Decline"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 block mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function FileField({ label, file, onChange, required = false }: { label: string; file: File | null; onChange: (f: File | null) => void; required?: boolean }) {
  return (
    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
      {file ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Upload className="w-5 h-5 text-slate-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        <p className="text-xs text-slate-400 truncate">{file ? file.name : "Click to upload"}</p>
      </div>
      {file && <FileText className="w-4 h-4 text-slate-400 shrink-0" />}
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
