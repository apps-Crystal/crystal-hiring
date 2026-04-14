"use client";

import { useEffect, useState, use } from "react";
import { Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";

interface CandidateInfo {
  screeningId: string;
  candidateName: string;
  position: string;
  email: string;
  phone: string;
  location: string;
  currentCTC: string;
}

const DOCS = [
  { key: "idProof", label: "Government ID proof (Aadhaar / PAN / Passport)", required: true },
  { key: "degree", label: "Degree certificate(s)", required: true },
  { key: "appointment", label: "Appointment letter from current/last employer", required: false },
  { key: "paySlips", label: "Last 3 months' pay slips", required: false },
  { key: "cv", label: "Latest CV / Resume", required: true },
] as const;

export default function DocumentSubmitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [info, setInfo] = useState<CandidateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", location: "", currentCTC: "",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/public/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setInfo(d);
          setForm({
            fullName: d.candidateName ?? "",
            phone: d.phone ?? "",
            email: d.email ?? "",
            location: d.location ?? "",
            currentCTC: d.currentCTC ?? "",
          });
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!confirmed) { setError("Please confirm document authenticity"); return; }

    const missing = DOCS.filter(d => d.required && !files[d.key]);
    if (missing.length) {
      setError(`Please upload: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("fullName", form.fullName);
    fd.append("phone", form.phone);
    fd.append("email", form.email);
    fd.append("location", form.location);
    fd.append("currentCTC", form.currentCTC);
    fd.append("confirmed", "true");
    for (const [k, f] of Object.entries(files)) {
      if (f) fd.append(k, f);
    }

    const res = await fetch(`/api/documents/public/${token}`, { method: "POST", body: fd });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) setSubmitted(true);
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
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Link Invalid or Expired</h1>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-400 mt-4">Please contact HR at Crystal Group for a fresh link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-emerald-200 p-8 max-w-md text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Documents Submitted</h1>
          <p className="text-sm text-slate-500">Thank you! Our HR team will review your submission and get back to you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">Crystal Group — Document Submission</h1>
          <p className="text-slate-300 text-sm mt-1">Position: {info?.position}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-b-xl border border-slate-200 p-6 space-y-6">
          <p className="text-sm text-slate-600">
            Hi <strong>{info?.candidateName}</strong>, please submit the documents below to complete your onboarding.
          </p>

          {/* Personal details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.fullName} onChange={v => setForm(p => ({ ...p, fullName: v }))} required />
            <Field label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} required />
            <Field label="Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} required />
            <Field label="Location" value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} />
            <Field label="Current CTC (Lakhs)" value={form.currentCTC} onChange={v => setForm(p => ({ ...p, currentCTC: v }))} />
          </div>

          {/* Documents */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Required Documents</h2>
            {DOCS.map(d => (
              <FileField
                key={d.key}
                label={d.label}
                file={files[d.key] ?? null}
                onChange={f => setFiles(p => ({ ...p, [d.key]: f }))}
              />
            ))}
            <p className="text-xs text-slate-400">PDF, JPG, or PNG • max 10MB each</p>
          </div>

          {/* Confirmation */}
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
            <span>I confirm that the documents uploaded are authentic and true to the best of my knowledge.</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Uploading documents…" : "Submit Documents"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required = false,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
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

function FileField({
  label, file, onChange,
}: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
      {file ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
      ) : (
        <Upload className="w-5 h-5 text-slate-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
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
