import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return val as string || "—";
  return `₹${n.toFixed(2)}L`;
}

export function scoreColor(score: number | string): string {
  const n = typeof score === "string" ? parseFloat(score) : score;
  if (isNaN(n)) return "text-gray-400";
  if (n >= 7) return "text-green-600";
  if (n >= 4) return "text-yellow-600";
  return "text-red-600";
}

export function scoreBadgeClass(score: number | string): string {
  const n = typeof score === "string" ? parseFloat(score) : score;
  if (isNaN(n)) return "bg-gray-100 text-gray-600";
  if (n >= 7) return "bg-green-100 text-green-700";
  if (n >= 4) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export function decisionBadge(decision: string): { label: string; class: string } {
  const d = (decision ?? "").toLowerCase();
  if (d.includes("shortlist") || d.includes("selected") || d.includes("proceed"))
    return { label: decision, class: "bg-green-100 text-green-700" };
  if (d.includes("hold"))
    return { label: decision, class: "bg-yellow-100 text-yellow-700" };
  if (d.includes("reject") || d.includes("not selected"))
    return { label: decision, class: "bg-red-100 text-red-700" };
  return { label: decision || "—", class: "bg-gray-100 text-gray-600" };
}

export function stageBadge(stage: string): { label: string; class: string } {
  const map: Record<string, { label: string; class: string }> = {
    SCREENED:   { label: "Screened",   class: "bg-blue-100 text-blue-700" },
    INTERVIEW:  { label: "Interview",  class: "bg-purple-100 text-purple-700" },
    DOCUMENTS:  { label: "Documents",  class: "bg-orange-100 text-orange-700" },
    OFFER:      { label: "Offer",      class: "bg-cyan-100 text-cyan-700" },
    ACCEPTED:   { label: "Accepted",   class: "bg-green-100 text-green-700" },
    REJECTED:   { label: "Rejected",   class: "bg-red-100 text-red-700" },
    HOLD:       { label: "Hold",       class: "bg-yellow-100 text-yellow-700" },
  };
  return map[stage] ?? { label: stage || "—", class: "bg-gray-100 text-gray-600" };
}

export function requisitionStatusBadge(status: string): { label: string; class: string } {
  const map: Record<string, { label: string; class: string }> = {
    PENDING_APPROVAL: { label: "Pending Approval", class: "bg-yellow-100 text-yellow-700" },
    APPROVED:         { label: "Approved",          class: "bg-green-100 text-green-700" },
    OPEN:             { label: "Open",              class: "bg-blue-100 text-blue-700" },
    REJECTED:         { label: "Rejected",          class: "bg-red-100 text-red-700" },
    CLOSED:           { label: "Closed",            class: "bg-gray-100 text-gray-600" },
  };
  return map[status] ?? { label: status || "—", class: "bg-gray-100 text-gray-600" };
}
