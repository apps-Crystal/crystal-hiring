"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Sparkles, ArrowLeft, Upload } from "lucide-react";

const LOCATIONS = [
  "Dankuni", "Kolkata", "Thane", "Noida", "Kheda",
  "Detroj", "Dhulagarh", "Bhubaneswar",
];

const DEPARTMENTS = [
  "Operations", "Finance", "HR", "IT", "Sales",
  "Procurement", "Logistics", "Warehouse", "Admin", "Quality",
];

export default function NewRequisitionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingQs, setGeneratingQs] = useState(false);
  const [generatedQs, setGeneratedQs] = useState<{ question1: string; question2: string; question3: string } | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    positionTitle: "",
    department: "",
    jobType: "",
    totalNos: "",
    location: "",
    reportingManager: "",
    experience: "",
    qualification: "",
    salaryRange: "",
    preferredJoiningDate: "",
    keySkills: "",
    coreResponsibilities: "",
    preferredFilters: "",
    businessJustification: "",
    jdUrl: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePreviewQuestions() {
    if (!form.positionTitle || !form.coreResponsibilities) {
      setError("Please fill Position Title and Core Responsibilities first.");
      return;
    }
    setError("");
    setGeneratingQs(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionTitle: form.positionTitle,
          coreResponsibilities: form.coreResponsibilities,
          keySkills: form.keySkills,
          experience: form.experience,
        }),
      });
      const data = await res.json();
      setGeneratedQs(data.questions);
    } catch {
      setError("Failed to generate questions. Please try again.");
    } finally {
      setGeneratingQs(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Submission failed");
        return;
      }
      router.push("/dashboard/requisitions");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Job Requisition</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Fill in the details to create a new requisition. AI will generate 3 screening questions automatically.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Position Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Position Title"
                required
                placeholder="e.g. Senior Operations Manager"
                value={form.positionTitle}
                onChange={(e) => update("positionTitle", e.target.value)}
              />
            </div>

            <Select
              label="Department"
              required
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              placeholder="Select department"
            />

            <Select
              label="Job Type"
              required
              value={form.jobType}
              onChange={(e) => update("jobType", e.target.value)}
              options={[
                { value: "Full-Time", label: "Full-Time" },
                { value: "Part-Time", label: "Part-Time" },
                { value: "Contract", label: "Contract" },
              ]}
              placeholder="Select job type"
            />

            <Input
              label="Total Openings"
              required
              type="number"
              min="1"
              placeholder="1"
              value={form.totalNos}
              onChange={(e) => update("totalNos", e.target.value)}
            />

            <Select
              label="Location"
              required
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              placeholder="Select location"
            />

            <Input
              label="Reporting Manager"
              placeholder="Name / Designation"
              value={form.reportingManager}
              onChange={(e) => update("reportingManager", e.target.value)}
            />

            <Input
              label="Required Years of Experience"
              placeholder="e.g. 3–5 years"
              value={form.experience}
              onChange={(e) => update("experience", e.target.value)}
            />

            <Input
              label="Educational Qualification"
              placeholder="e.g. B.E. / MBA"
              value={form.qualification}
              onChange={(e) => update("qualification", e.target.value)}
            />

            <Input
              label="Salary Range"
              placeholder="e.g. 4–6 LPA"
              value={form.salaryRange}
              onChange={(e) => update("salaryRange", e.target.value)}
            />

            <Input
              label="Preferred Joining Date"
              type="date"
              value={form.preferredJoiningDate}
              onChange={(e) => update("preferredJoiningDate", e.target.value)}
            />
          </div>
        </div>

        {/* JD Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Job Description</h2>
          <div className="space-y-4">
            <Textarea
              label="Key Skills Required"
              placeholder="e.g. SAP, Supply Chain, Team Management, Excel"
              rows={3}
              value={form.keySkills}
              onChange={(e) => update("keySkills", e.target.value)}
            />

            <Textarea
              label="Core Responsibilities"
              required
              placeholder="Describe the core duties and expectations for this role…"
              rows={5}
              value={form.coreResponsibilities}
              onChange={(e) => update("coreResponsibilities", e.target.value)}
            />

            <Textarea
              label="Preferred Candidate Features / Filters"
              placeholder="e.g. experience in FMCG, logistics background, bilingual…"
              rows={2}
              value={form.preferredFilters}
              onChange={(e) => update("preferredFilters", e.target.value)}
            />

            <Textarea
              label="Business Justification"
              placeholder="Explain the business need for this hire…"
              rows={3}
              value={form.businessJustification}
              onChange={(e) => update("businessJustification", e.target.value)}
            />
          </div>
        </div>

        {/* AI Question Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-700">AI Screening Questions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Preview the 3 questions that will be auto-generated from the JD
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviewQuestions}
              disabled={generatingQs}
            >
              <Sparkles className="w-4 h-4" />
              {generatingQs ? "Generating…" : "Preview Questions"}
            </Button>
          </div>

          {generatedQs ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
              {[generatedQs.question1, generatedQs.question2, generatedQs.question3].map(
                (q, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-emerald-600 font-bold text-sm shrink-0">Q{i + 1}.</span>
                    <p className="text-sm text-slate-700">{q}</p>
                  </div>
                )
              )}
              <p className="text-xs text-slate-500 mt-2">
                These questions will be regenerated and locked when the requisition is approved.
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Click &quot;Preview Questions&quot; to see AI-generated screening questions</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit Requisition"}
          </Button>
        </div>
      </form>
    </div>
  );
}
