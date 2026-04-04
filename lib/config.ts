/**
 * config.ts — Crystal Group Hiring System
 * Manages system configuration stored in the CONFIG sheet.
 * Keys managed here:
 *   REQUISITION_APPROVERS     — comma-separated emails
 *   SCREENING_NOTIFY          — comma-separated emails (HR Senior, TA Head)
 *   OFFER_APPROVERS           — comma-separated emails (Management, CHRO)
 *   HR_EXEC_LIST              — comma-separated emails
 *   CULTURE_GOALS             — free text
 *   DOC_CHECKLIST             — JSON array of document names
 */

import { readSheet, updateRowByKey, appendRowByFields, nowTimestamp } from "./sheets";

export async function getConfig(key: string): Promise<string> {
  const rows = await readSheet("CONFIG");
  const row = rows.find((r) => r["KEY"] === key);
  return row?.["VALUE"] ?? "";
}

export async function setConfig(key: string, value: string, updatedBy: string): Promise<void> {
  const rows = await readSheet("CONFIG");
  const exists = rows.some((r) => r["KEY"] === key);
  if (exists) {
    await updateRowByKey("CONFIG", "KEY", key, {
      "VALUE": value,
      "UPDATED_BY": updatedBy,
      "UPDATED_DATE": nowTimestamp(),
    });
  } else {
    await appendRowByFields("CONFIG", {
      "KEY": key,
      "VALUE": value,
      "UPDATED_BY": updatedBy,
      "UPDATED_DATE": nowTimestamp(),
    });
  }
}

export async function getEmailList(key: string): Promise<string[]> {
  const val = await getConfig(key);
  return val
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function getCultureGoals(): Promise<string> {
  return getConfig("CULTURE_GOALS");
}

export async function getDocChecklist(): Promise<string[]> {
  const val = await getConfig("DOC_CHECKLIST");
  try {
    return JSON.parse(val) as string[];
  } catch {
    return [
      "ID proof",
      "Degree certificate(s)",
      "Appointment letter from your current/last employer",
      "Last three months' pay slips",
      "Latest CV",
    ];
  }
}
