"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface Config {
  requisitionApprovers: string[];
  screeningNotify: string[];
  offerApprovers: string[];
  hrExecList: string[];
  cultureGoals: string;
  docChecklist: string[];
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/auth/session").then(r => r.json()),
    ]).then(([c, s]) => {
      setConfig(c);
      setUserRole(s.user?.role ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  function updateEmailList(key: keyof Config, idx: number, val: string) {
    setConfig(prev => {
      if (!prev) return prev;
      const arr = [...(prev[key] as string[])];
      arr[idx] = val;
      return { ...prev, [key]: arr };
    });
  }

  function addEmail(key: keyof Config) {
    setConfig(prev => {
      if (!prev) return prev;
      return { ...prev, [key]: [...(prev[key] as string[]), ""] };
    });
  }

  function removeEmail(key: keyof Config, idx: number) {
    setConfig(prev => {
      if (!prev) return prev;
      const arr = (prev[key] as string[]).filter((_, i) => i !== idx);
      return { ...prev, [key]: arr };
    });
  }

  function updateChecklist(idx: number, val: string) {
    setConfig(prev => {
      if (!prev) return prev;
      const arr = [...prev.docChecklist];
      arr[idx] = val;
      return { ...prev, docChecklist: arr };
    });
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading settings…</div>;

  if (!["CHRO", "TA_HEAD"].includes(userRole)) {
    return <div className="p-8 text-slate-400 text-sm">Settings are only available to CHRO and TA Head.</div>;
  }

  if (!config) return null;

  const emailSections = [
    { key: "requisitionApprovers" as keyof Config, label: "Requisition Approvers", desc: "Notified when a new requisition is submitted (CHRO / TA Head)" },
    { key: "screeningNotify" as keyof Config, label: "Screening Notification List", desc: "Notified after AI evaluation is complete (HR Senior / TA Head)" },
    { key: "offerApprovers" as keyof Config, label: "Offer Approvers", desc: "Notified for offer approval (Management / CHRO)" },
    { key: "hrExecList" as keyof Config, label: "HR Team List", desc: "Notified about requisition decisions" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
            <p className="text-slate-500 text-sm mt-0.5">Configure email lists, culture goals, and document checklist</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : saved ? "Saved!" : "Save All"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Email Lists */}
        {emailSections.map(({ key, label, desc }) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
              <Button size="sm" variant="ghost" onClick={() => addEmail(key)}>
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
            <p className="text-xs text-slate-500 mb-3">{desc}</p>
            <div className="space-y-2">
              {(config[key] as string[]).map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => updateEmailList(key, i, e.target.value)}
                    placeholder="email@crystalgroup.in"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button onClick={() => removeEmail(key, i)} className="p-2 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(config[key] as string[]).length === 0 && (
                <p className="text-xs text-slate-400 italic">No emails configured. Add at least one.</p>
              )}
            </div>
          </div>
        ))}

        {/* Culture Goals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Culture Fitment Goals</h3>
          <p className="text-xs text-slate-500 mb-3">
            These values are used by AI to score every candidate&apos;s culture fit during screening evaluation.
          </p>
          <Textarea
            rows={6}
            value={config.cultureGoals}
            onChange={e => setConfig(prev => prev ? { ...prev, cultureGoals: e.target.value } : prev)}
            placeholder="Describe Crystal Group's values and behavioural expectations…
e.g.
- We value punctuality, ownership, and proactive communication
- Candidates should demonstrate adaptability in fast-paced logistics environments
- We look for candidates who respect hierarchy while being solution-oriented"
          />
        </div>

        {/* Document Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-700">Document Checklist</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfig(prev => prev ? { ...prev, docChecklist: [...prev.docChecklist, ""] } : prev)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
          <p className="text-xs text-slate-500 mb-3">Documents required from candidates during document collection stage.</p>
          <div className="space-y-2">
            {config.docChecklist.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={e => updateChecklist(i, e.target.value)}
                  placeholder="Document name"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => setConfig(prev => prev ? { ...prev, docChecklist: prev.docChecklist.filter((_, j) => j !== i) } : prev)}
                  className="p-2 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
