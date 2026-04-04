"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface DocumentRecord extends Record<string, string> {}

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [candidate, setCandidate] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/documents?screeningId=${id}`).then(r => r.json()),
      fetch(`/api/screening/${id}`).then(r => r.json()),
    ]).then(([dData, cData]) => {
      setDoc(dData.document ?? null);
      setCandidate(cData.candidate ?? null);
      setLoading(false);
    });
  }, [id]);

  async function triggerVerification() {
    setVerifying(true);
    await fetch(`/api/documents/${id}/verify`, { method: "POST" });
    const res = await fetch(`/api/documents?screeningId=${id}`).then(r => r.json());
    setDoc(res.document ?? null);
    setVerifying(false);
  }

  async function markComplete() {
    setMarking(true);
    await fetch(`/api/documents/${id}/verify`, { method: "POST" });
    router.push(`/dashboard/offers/new?screeningId=${id}`);
    setMarking(false);
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading documents…</div>;

  const docs = [
    { key: "ID proof", label: "ID Proof", verificationKey: "AI ID Proof Verification" },
    { key: "Degree certificate(s)", label: "Degree Certificate(s)", verificationKey: "AI Degree Verification" },
    { key: "Appointment letter from your current/last employer", label: "Appointment Letter", verificationKey: "AI Appointment Letter Verification" },
    { key: "Last three months' pay slips", label: "Pay Slips (3 months)", verificationKey: "AI Pay Slips Verification" },
    { key: "Latest CV", label: "Latest CV", verificationKey: "AI CV Verification" },
  ];

  const verificationDone = doc?.["AI Verification Status"];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Document Verification</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {candidate?.["Candidate Name"]} · {id}
          </p>
        </div>
      </div>

      {!doc ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
          <p className="text-yellow-700 font-medium">Documents not yet submitted by candidate</p>
          <p className="text-xs text-slate-500 mt-2">Send the document request link to the candidate first.</p>
        </div>
      ) : (
        <>
          {/* AI Verification Status */}
          {verificationDone && (
            <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${
              verificationDone === "VERIFIED" ? "bg-green-50 border border-green-200" :
              verificationDone === "FLAGS_FOUND" ? "bg-orange-50 border border-orange-200" :
              "bg-red-50 border border-red-200"
            }`}>
              {verificationDone === "VERIFIED" ? <CheckCircle className="w-5 h-5 text-green-500" /> :
               verificationDone === "FLAGS_FOUND" ? <AlertCircle className="w-5 h-5 text-orange-500" /> :
               <XCircle className="w-5 h-5 text-red-500" />}
              <div>
                <p className="font-semibold text-sm">AI Verification: {verificationDone}</p>
                {doc["AI Verification Flags"] && <p className="text-xs text-slate-600 mt-0.5">{doc["AI Verification Flags"]}</p>}
              </div>
            </div>
          )}

          {/* Document List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">AI Check</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(({ key, label, verificationKey }) => {
                  const url = doc[key];
                  const aiCheck = doc[verificationKey];
                  return (
                    <tr key={key}>
                      <td className="px-4 py-3 text-slate-700 font-medium">{label}</td>
                      <td className="px-4 py-3">
                        {url ? (
                          <Badge className="bg-green-100 text-green-700">Submitted</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Missing</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {aiCheck || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Candidate Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 text-sm grid grid-cols-2 gap-3">
            <div><p className="text-xs text-slate-500">Full Name</p><p className="font-medium">{doc["Full Name"] || "—"}</p></div>
            <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{doc["Phone No."] || "—"}</p></div>
            <div><p className="text-xs text-slate-500">Current CTC</p><p className="font-medium">{doc["Current CTC"] || "—"} L</p></div>
            <div><p className="text-xs text-slate-500">Confirmed</p><p className="font-medium">{doc["I confirm that the documents uploaded are authentic and true to the best of my knowledge."] || "—"}</p></div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={triggerVerification}
              disabled={verifying}
            >
              {verifying ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : "Run AI Verification"}
            </Button>
            {verificationDone === "VERIFIED" && (
              <Button onClick={markComplete} disabled={marking}>
                <CheckCircle className="w-4 h-4" />
                {marking ? "Processing…" : "Mark Verified & Raise Offer"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
