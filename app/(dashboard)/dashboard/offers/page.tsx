"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";

interface Offer extends Record<string, string> {}

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [tab, setTab] = useState<"PENDING_APPROVAL" | "APPROVED" | "ISSUED" | "ALL">("PENDING_APPROVAL");

  // Approval modal
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; offer: Offer | null }>({ open: false, offer: null });
  const [aForm, setAForm] = useState({ decision: "APPROVED", approvedCTC: "", remarks: "", doj: "", designation: "" });
  const [approving, setApproving] = useState(false);

  // Issue offer modal
  const [issueModal, setIssueModal] = useState<{ open: boolean; offer: Offer | null }>({ open: false, offer: null });
  const [issueForm, setIssueForm] = useState({ designation: "", hiringLocation: "", finalSalary: "", doj: "" });
  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<{ acceptLink: string; mailStatus: string } | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/offers");
    const data = await res.json();
    setOffers(data.offers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOffers();
    fetch("/api/auth/session").then(r => r.json()).then(d => setUserRole(d.user?.role ?? ""));
  }, [fetchOffers]);

  const filtered = offers.filter(o => {
    const status = o["Offer Request Status"] ?? "PENDING_APPROVAL";
    const issued = (o["Offer Letter Issued"] ?? "").toLowerCase() === "yes" || o["Stage"] === "OFFER_ISSUED";
    if (tab === "PENDING_APPROVAL" && status !== "PENDING_APPROVAL") return false;
    if (tab === "APPROVED" && !(status === "APPROVED" && !issued)) return false;
    if (tab === "ISSUED" && !issued) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o["Candidate Name (Auto)"]?.toLowerCase().includes(q) ||
      o["Screening ID (Auto)"]?.toLowerCase().includes(q) ||
      o["Designation to be Offered"]?.toLowerCase().includes(q)
    );
  });

  const counts = {
    pending: offers.filter(o => (o["Offer Request Status"] ?? "PENDING_APPROVAL") === "PENDING_APPROVAL").length,
    approved: offers.filter(o => o["Offer Request Status"] === "APPROVED").length,
    issued: offers.filter(o => o["Stage"] === "OFFER_ISSUED").length,
  };

  async function handleApprove() {
    if (!approvalModal.offer) return;
    setApproving(true);
    const id = approvalModal.offer["Screening ID (Auto)"];
    await fetch(`/api/offers/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aForm),
    });
    setApprovalModal({ open: false, offer: null });
    fetchOffers();
    setApproving(false);
  }

  function openIssueModal(o: Offer) {
    setIssueForm({
      designation: o["Designation to be Offered"] ?? "",
      hiringLocation: o["Location"] ?? "",
      finalSalary: o["Final Salary CTC Amount (In Lakhs)"] ?? "",
      doj: o["Date of Joining"] ?? "",
    });
    setOfferLetterFile(null);
    setIssueResult(null);
    setIssueModal({ open: true, offer: o });
  }

  async function handleIssueOffer() {
    if (!issueModal.offer || !offerLetterFile) return;
    setIssuing(true);
    const fd = new FormData();
    fd.append("screeningId", issueModal.offer["Screening ID (Auto)"]);
    fd.append("designation", issueForm.designation);
    fd.append("hiringLocation", issueForm.hiringLocation);
    fd.append("finalSalary", issueForm.finalSalary);
    fd.append("doj", issueForm.doj);
    fd.append("offerLetter", offerLetterFile);

    const res = await fetch("/api/offers/issue", { method: "POST", body: fd });
    const data = await res.json();
    setIssuing(false);
    if (res.ok) {
      setIssueResult({ acceptLink: data.acceptLink, mailStatus: data.mailStatus });
      fetchOffers();
    } else {
      alert(data.error ?? "Failed to issue offer");
    }
  }

  // Manager-level approval only. CHRO = developer/full-access.
  const canApprove = ["CHRO", "MANAGEMENT"].includes(userRole);

  function statusBadge(status: string) {
    const m: Record<string, string> = {
      PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      HOLD: "bg-orange-100 text-orange-700",
    };
    return m[status] ?? "bg-gray-100 text-gray-600";
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Offer Requests</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} offers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {([
          ["PENDING_APPROVAL", `Pending Approval (${counts.pending})`],
          ["APPROVED", `Ready to Issue (${counts.approved})`],
          ["ISSUED", `Issued (${counts.issued})`],
          ["ALL", "All"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === k
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Search candidate or designation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No offer requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((o, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{o["Candidate Name (Auto)"]}</p>
                  <p className="text-xs text-slate-400 font-mono">{o["Screening ID (Auto)"]}</p>
                </div>
                <Badge className={statusBadge(o["Offer Request Status"] || "PENDING_APPROVAL")}>
                  {(o["Offer Letter Issued"] === "Yes" ? "ISSUED" : (o["Offer Request Status"] || "PENDING_APPROVAL")).replace("_", " ")}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-slate-600 mb-4">
                <p><strong>Designation:</strong> {o["Designation to be Offered"] || "—"}</p>
                <p><strong>Final CTC:</strong> {o["Final Salary CTC Amount (In Lakhs)"] || "—"} L</p>
                <p><strong>DOJ:</strong> {o["Date of Joining"] || "—"}</p>
                <p><strong>Location:</strong> {o["Location"] || "—"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/candidates/${o["Screening ID (Auto)"]}`)}
                >
                  View Profile
                </Button>
                {canApprove && o["Offer Request Status"] === "PENDING_APPROVAL" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setApprovalModal({ open: true, offer: o });
                      setAForm({
                        decision: "APPROVED",
                        approvedCTC: o["Final Salary CTC Amount (In Lakhs)"] ?? "",
                        remarks: "",
                        doj: o["Date of Joining"] ?? "",
                        designation: o["Designation to be Offered"] ?? "",
                      });
                    }}
                  >
                    Review & Decide
                  </Button>
                )}
                {o["Offer Request Status"] === "APPROVED" && (
                  <Button size="sm" onClick={() => openIssueModal(o)}>
                    Issue Offer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        open={approvalModal.open}
        onClose={() => setApprovalModal({ open: false, offer: null })}
        title={`Offer Decision — ${approvalModal.offer?.["Candidate Name (Auto)"]}`}
        size="md"
      >
        <div className="p-6 space-y-4">
          {/* Candidate Snapshot */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <p><strong>Position:</strong> {approvalModal.offer?.["Designation to be Offered"]}</p>
            <p><strong>Current CTC:</strong> {approvalModal.offer?.["Current CTC"]} L</p>
            <p><strong>Expected CTC:</strong> {approvalModal.offer?.["Expected CTC"]} L</p>
            <p><strong>Proposed CTC:</strong> {approvalModal.offer?.["Final Salary CTC Amount (In Lakhs)"]} L</p>
          </div>

          {/* Decision Buttons */}
          <div className="flex gap-3">
            {["APPROVED", "HOLD", "REJECTED"].map(d => (
              <button
                key={d}
                onClick={() => setAForm(prev => ({ ...prev, decision: d }))}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                  aForm.decision === d
                    ? d === "APPROVED" ? "bg-emerald-600 text-white border-emerald-600"
                    : d === "HOLD" ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-red-600 text-white border-red-600"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {d === "APPROVED" ? <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> : d === "REJECTED" ? <XCircle className="w-3.5 h-3.5 inline mr-1" /> : null}
                {d}
              </button>
            ))}
          </div>

          {aForm.decision === "APPROVED" && (
            <>
              <Input
                label="Approved CTC (In Lakhs)"
                value={aForm.approvedCTC}
                onChange={e => setAForm(prev => ({ ...prev, approvedCTC: e.target.value }))}
                placeholder="Final approved CTC"
              />
              <Input
                label="Designation to be Offered"
                value={aForm.designation}
                onChange={e => setAForm(prev => ({ ...prev, designation: e.target.value }))}
              />
              <Input
                label="Date of Joining"
                type="date"
                value={aForm.doj}
                onChange={e => setAForm(prev => ({ ...prev, doj: e.target.value }))}
              />
            </>
          )}

          <Textarea
            label="Remarks"
            rows={3}
            value={aForm.remarks}
            onChange={e => setAForm(prev => ({ ...prev, remarks: e.target.value }))}
          />

          <Button className="w-full" onClick={handleApprove} disabled={approving}>
            {approving ? "Processing…" : `Confirm ${aForm.decision}`}
          </Button>
        </div>
      </Modal>

      {/* Issue Offer Modal */}
      <Modal
        open={issueModal.open}
        onClose={() => { setIssueModal({ open: false, offer: null }); setIssueResult(null); }}
        title={`Issue Offer — ${issueModal.offer?.["Candidate Name (Auto)"] ?? ""}`}
        size="md"
      >
        <div className="p-6 space-y-4">
          {issueResult ? (
            <div className="space-y-4">
              <div className={`border rounded-xl p-4 text-center ${
                issueResult.mailStatus === "SENT"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <CheckCircle className={`w-10 h-10 mx-auto mb-2 ${
                  issueResult.mailStatus === "SENT" ? "text-emerald-600" : "text-yellow-600"
                }`} />
                <p className={`text-sm font-semibold ${
                  issueResult.mailStatus === "SENT" ? "text-emerald-800" : "text-yellow-800"
                }`}>
                  Offer letter uploaded for {issueModal.offer?.["Candidate Name (Auto)"]}
                </p>
                <p className={`text-xs mt-1 ${
                  issueResult.mailStatus === "SENT" ? "text-emerald-600" : "text-yellow-700"
                }`}>
                  {issueResult.mailStatus === "SENT"
                    ? "✓ Email sent to candidate"
                    : "⚠ Email failed — share the acceptance link manually"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">Acceptance Link (backup)</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={issueResult.acceptLink}
                    className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(issueResult.acceptLink)}
                    className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setIssueModal({ open: false, offer: null }); setIssueResult(null); }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Designation"
                  required
                  value={issueForm.designation}
                  onChange={e => setIssueForm(p => ({ ...p, designation: e.target.value }))}
                />
                <Input
                  label="Hiring Location"
                  value={issueForm.hiringLocation}
                  onChange={e => setIssueForm(p => ({ ...p, hiringLocation: e.target.value }))}
                />
                <Input
                  label="Final Salary (Per Annum)"
                  required
                  value={issueForm.finalSalary}
                  onChange={e => setIssueForm(p => ({ ...p, finalSalary: e.target.value }))}
                  placeholder="e.g. 550000"
                />
                <Input
                  label="Date of Joining"
                  type="date"
                  required
                  value={issueForm.doj}
                  onChange={e => setIssueForm(p => ({ ...p, doj: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Offer Letter PDF <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setOfferLetterFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                />
                {offerLetterFile && (
                  <p className="text-xs text-emerald-600 mt-1">✓ {offerLetterFile.name}</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleIssueOffer}
                disabled={issuing || !offerLetterFile || !issueForm.designation || !issueForm.finalSalary || !issueForm.doj}
              >
                {issuing ? "Uploading & Sending…" : "Upload & Email Offer Letter"}
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
