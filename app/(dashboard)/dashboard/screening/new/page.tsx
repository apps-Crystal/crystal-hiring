"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";

import { Sparkles, Upload, ArrowLeft, FileText, Loader2 } from "lucide-react";

const SOURCES = ["Naukri Posting", "Naukri Search", "LinkedIn", "Indeed", "Employee Reference", "Walk-In", "Other"];
const NOTICE_PERIODS = ["Immediate", "15 Days", "30 Days", "60+ Days"];
const ASSESSMENT = ["Shortlisted", "On Hold", "Rejected"];

function ScreeningFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reqId = searchParams.get("reqId") ?? "";

  const [requisition, setRequisition] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [resumeFile, setResumeFile] = useState<{ name: string; size: number } | null>(null);
  const [driveError, setDriveError] = useState("");

  const [form, setForm] = useState({
    reqId,
    candidateName: "",
    phone: "",
    candidateEmail: "",
    jobLocation: "",
    position: "",
    experience: "",
    noticePeriod: "",
    currentCTC: "",
    expectedCTC: "",
    resumeUrl: "",
    screeningRemarks: "",
    skillAlignment: "",
    isStable: "",
    currentCompanyDetails: "",
    currentDesignation: "",
    willingToRelocate: "",
    availableDate: "",
    qualification: "",
    keySkills: "",
    computerProficiency: "",
    languages: "",
    expectedDOJ: "",
    redFlags: "",
    timingPreference: "",
    fitsRequirements: "",
    hrDecision: "",
    callRecordingUrl: "",
    source: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Fetch requisition details
  useEffect(() => {
    if (!reqId) return;
    fetch(`/api/requisitions/${reqId}`)
      .then((r) => r.json())
      .then((d) => {
        setRequisition(d.requisition ?? null);
        if (d.requisition) {
          update("position", d.requisition["Position Title"] ?? "");
          update("jobLocation", d.requisition["Location"] ?? "");
        }
      });
  }, [reqId]);

  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setResumeFile({ name: file.name, size: file.size });

    // Step 1: Upload resume to Drive
    setDriveError("");
    setUploading(true);
    try {
      const fd0 = new FormData();
      fd0.append("file", file);
      fd0.append("folder", "RESUMES");
      fd0.append("subFolder", `temp_${Date.now()}`);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd0 });
      const upData = await upRes.json();
      if (upData.url) {
        update("resumeUrl", upData.url);
      } else if (upData.error) {
        setDriveError(upData.error);
      }
    } catch (upErr) {
      setDriveError("Drive upload failed — check server logs.");
      console.error("[CV Upload] Drive upload failed:", upErr);
    } finally {
      setUploading(false);
    }

    // Step 2: Extract CV details via AI
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/extract-cv", { method: "POST", body: fd });
      const data = await res.json();

      console.log("[CV Extract] API response:", data);
      const raw = data.details ?? data;
      const d = Array.isArray(raw) ? raw[0] : raw; // AI sometimes returns array
      const str = (v: unknown) => (v != null && String(v).trim() !== "" ? String(v).trim() : "");

      const extracted = {
        candidateName: str(d.fullName),
        candidateEmail: str(d.email),
        phone: str(d.phone),
        currentCompanyDetails: str(d.currentCompany),
        currentDesignation: str(d.currentRole),
        experience: str(d.totalExperience),
        qualification: str(d.highestQualification),
        keySkills: str(d.keySkills),
        currentCTC: str(d.currentCTC),
        expectedCTC: str(d.expectedCTC),
        noticePeriod: str(d.noticePeriod),
        languages: str(d.languages),
      };
      console.log("[CV Extract] Mapped fields:", extracted);

      const hasAnyValue = Object.values(extracted).some((v) => v !== "");
      if (hasAnyValue) {
        setForm((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(extracted).filter(([, v]) => v !== "")
          ),
        }));
      } else {
        setError("AI could not extract details from this resume. Please fill manually.");
      }
    } catch (err) {
      setError("AI extraction failed. Resume uploaded — please fill details manually.");
      console.error(err);
    } finally {
      setExtracting(false);
    }
  }

  async function handleCallUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "RECORDINGS");
    fd.append("subFolder", `temp_${Date.now()}`);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    update("callRecordingUrl", data.url ?? "");
    setUploading(false);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.hrDecision) { setError("Please select Overall Fit Assessment"); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Submission failed");
        return;
      }
      const { screeningId } = await res.json();

      // Trigger AI evaluation in background — keepalive prevents cancellation on navigation
      fetch(`/api/screening/${encodeURIComponent(screeningId)}/evaluate`, { method: "POST", keepalive: true }).catch(console.error);

      router.push("/dashboard/candidates");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Candidate Screening</h1>
          {requisition && (
            <p className="text-slate-500 text-sm mt-0.5">
              {reqId} · {requisition["Position Title"]}
            </p>
          )}
        </div>
      </div>

      {/* AI Questions from Requisition */}
      {requisition?.["AI Question 1"] && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Technical Questions to Ask on Call</p>
          </div>
          <div className="space-y-2">
            {["AI Question 1", "AI Question 2", "AI Question 3"].map((qKey, i) =>
              requisition[qKey] ? (
                <div key={qKey} className="flex gap-2">
                  <span className="text-emerald-600 font-bold text-sm shrink-0">Q{i + 1}.</span>
                  <p className="text-sm text-slate-700">{requisition[qKey]}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CV Upload + OCR */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Resume Upload</h2>
          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${driveError ? "border-amber-400 bg-amber-50" : resumeFile ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-emerald-400"}`}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleCVUpload}
              className="hidden"
              id="cv-upload"
            />
            <label htmlFor="cv-upload" className="cursor-pointer">
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-blue-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Uploading to Drive…</p>
                  {resumeFile && <p className="text-xs text-slate-500 truncate max-w-xs">{resumeFile.name}</p>}
                </div>
              ) : extracting ? (
                <div className="flex flex-col items-center gap-2 text-emerald-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Extracting candidate details via AI…</p>
                  {resumeFile && <p className="text-xs text-emerald-500 truncate max-w-xs">{resumeFile.name}</p>}
                </div>
              ) : resumeFile ? (
                <div className="flex items-start gap-3 px-2">
                  <FileText className={`w-9 h-9 shrink-0 mt-0.5 ${driveError ? "text-amber-500" : "text-emerald-600"}`} />
                  <div className="text-left min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${driveError ? "text-amber-700" : "text-emerald-700"}`}>{resumeFile.name}</p>
                    <p className="text-xs text-slate-400">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                    {form.resumeUrl ? (
                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">✓ Saved to Drive</p>
                    ) : driveError ? (
                      <div className="mt-1">
                        <p className="text-xs text-amber-600 font-medium">⚠ Drive upload failed — AI extraction still worked</p>
                        <p className="text-xs text-amber-500 mt-0.5 break-all">{driveError.includes("storage quota") ? "Service account needs a Shared Drive. See setup instructions." : driveError}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 mt-0.5">✓ AI extracted · Drive save pending</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Click to replace</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload className="w-8 h-8" />
                  <p className="text-sm font-medium">Upload Resume (PDF, JPG, PNG)</p>
                  <p className="text-xs">AI will auto-fill candidate details · Max 10MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Candidate Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Candidate Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" required value={form.candidateName} onChange={(e) => update("candidateName", e.target.value)} placeholder="From resume" />
            <Input label="Phone Number" required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
            <Input label="Email ID" type="email" value={form.candidateEmail} onChange={(e) => update("candidateEmail", e.target.value)} />
            <Select
              label="Source"
              required
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              options={SOURCES.map((s) => ({ value: s, label: s }))}
              placeholder="Where did we find them?"
            />
            <Input label="Current Company & Designation" value={form.currentCompanyDetails} onChange={(e) => update("currentCompanyDetails", e.target.value)} placeholder="Company, Role, since MM/YYYY" />
            <Input label="Current Designation" value={form.currentDesignation} onChange={(e) => update("currentDesignation", e.target.value)} />
            <Input label="Total Experience" value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="e.g. 5 years" />
            <Input label="Highest Qualification" value={form.qualification} onChange={(e) => update("qualification", e.target.value)} />
            <Select
              label="Notice Period"
              value={form.noticePeriod}
              onChange={(e) => update("noticePeriod", e.target.value)}
              options={NOTICE_PERIODS.map((n) => ({ value: n, label: n }))}
              placeholder="Select"
            />
            <Input label="Job Location" value={form.jobLocation} onChange={(e) => update("jobLocation", e.target.value)} />
            <Input label="Current CTC (In Lakhs)" value={form.currentCTC} onChange={(e) => update("currentCTC", e.target.value)} placeholder="e.g. 4.5" />
            <Input label="Expected CTC (In Lakhs)" value={form.expectedCTC} onChange={(e) => update("expectedCTC", e.target.value)} placeholder="e.g. 6.0" />
            <Input label="Languages Known" value={form.languages} onChange={(e) => update("languages", e.target.value)} placeholder="e.g. Hindi, English, Bengali" />
            <Input label="Computer Proficiency" value={form.computerProficiency} onChange={(e) => update("computerProficiency", e.target.value)} placeholder="e.g. MS Office, SAP, Tally" />
            <Input label="Willing to Relocate?" value={form.willingToRelocate} onChange={(e) => update("willingToRelocate", e.target.value)} placeholder="Yes / No / Specific locations" />
            <Input label="Available for Interview" type="date" value={form.availableDate} onChange={(e) => update("availableDate", e.target.value)} />
            <Input label="Expected Date of Joining" type="date" value={form.expectedDOJ} onChange={(e) => update("expectedDOJ", e.target.value)} />
            <Input label="Interview Timing Preference" value={form.timingPreference} onChange={(e) => update("timingPreference", e.target.value)} placeholder="e.g. Morning, after 6 PM" />
          </div>
          <div className="mt-4 space-y-4">
            <Textarea label="Key Skills" rows={2} value={form.keySkills} onChange={(e) => update("keySkills", e.target.value)} />
          </div>
        </div>

        {/* Screening Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Screening Assessment</h2>
          <div className="space-y-4">
            <Textarea
              label="Skill Alignment — What knowledge/skills align with this position?"
              rows={3}
              required
              value={form.skillAlignment}
              onChange={(e) => update("skillAlignment", e.target.value)}
            />
            <Textarea
              label="Is the candidate overall stable?"
              rows={2}
              value={form.isStable}
              onChange={(e) => update("isStable", e.target.value)}
              placeholder="Comment on job stability, frequent changes, etc."
            />
            <Textarea
              label="Red Flags (if any)"
              rows={2}
              value={form.redFlags}
              onChange={(e) => update("redFlags", e.target.value)}
            />
            <Textarea
              label="Does the Candidate Fit the Basic Requirements?"
              rows={2}
              required
              value={form.fitsRequirements}
              onChange={(e) => update("fitsRequirements", e.target.value)}
            />
            <Textarea
              label="Screening Remarks"
              rows={4}
              required
              value={form.screeningRemarks}
              onChange={(e) => update("screeningRemarks", e.target.value)}
              placeholder="Detailed observations from the screening call…"
            />

            {/* Call Recording Upload */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Upload Call Recording
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                <input
                  type="file"
                  accept=".mp3,.m4a,.wav,.ogg,.webm"
                  onChange={handleCallUpload}
                  className="hidden"
                  id="call-upload"
                />
                <label htmlFor="call-upload" className="cursor-pointer text-sm text-slate-500">
                  {form.callRecordingUrl ? (
                    <span className="text-emerald-600 font-medium">✓ Recording uploaded · Click to replace</span>
                  ) : uploading ? (
                    <span className="text-slate-400">Uploading…</span>
                  ) : (
                    "Click to upload call recording (MP3, M4A, WAV)"
                  )}
                </label>
              </div>
              {form.callRecordingUrl && (
                <p className="text-xs text-emerald-600 mt-1">AI transcription and evaluation will run after submission</p>
              )}
            </div>

            {/* HR Decision */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Overall Candidate Fit Assessment <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {ASSESSMENT.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => update("hrDecision", a)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.hrDecision === a
                        ? a === "Shortlisted"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : a === "On Hold"
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-red-600 text-white border-red-600"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading || extracting}>
            {loading ? "Submitting…" : "Submit & Trigger AI Evaluation"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewScreeningPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}>
      <ScreeningFormInner />
    </Suspense>
  );
}
