/**
 * sheets.ts — Crystal Group AI-Powered Hiring System
 * All Google Sheets reads/writes go through this module.
 */

import { google } from "googleapis";
import { getSheetColumns } from "./sheet-schema";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ─────────────────────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/** Generate REQ/2025/001 style IDs */
export function generateReqId(seq: number): string {
  const year = new Date().getFullYear();
  return `REQ/${year}/${String(seq).padStart(3, "0")}`;
}

/** Generate EMP/2025/CRPL001 style screening IDs */
export function generateScreeningId(seq: number): string {
  const year = new Date().getFullYear();
  return `EMP/${year}/CRPL${String(seq).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC READ
// ─────────────────────────────────────────────────────────────────────────────

export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });

    const rows = res.data.values ?? [];
    if (rows.length < 2) return [];

    const headers = (rows[0] as string[]).map((h) => h?.trim() ?? "");
    return rows.slice(1)
      .filter((row) => (row as string[]).some((cell) => cell?.trim() !== ""))
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = (row[i] as string) ?? "";
        });
        return obj;
      });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unable to parse range")) {
      console.warn(`[sheets] Sheet "${sheetName}" not found — returning [].`);
      return [];
    }
    throw err;
  }
}

/** Read a single row by matching a key column value */
export async function findRow(
  sheetName: string,
  keyCol: string,
  keyVal: string
): Promise<Record<string, string> | null> {
  const rows = await readSheet(sheetName);
  return rows.find((r) => r[keyCol] === keyVal) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC WRITE
// ─────────────────────────────────────────────────────────────────────────────

export async function appendRowByFields(
  sheetName: string,
  fields: Record<string, string | number | boolean | null | undefined>
): Promise<void> {
  const sheets = getSheetsClient();

  let headers: string[] = [];
  const schemaColumns = getSheetColumns(sheetName);

  if (schemaColumns) {
    headers = [...schemaColumns];
  } else {
    // Fallback: read live headers
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });
    headers = (res.data.values?.[0] as string[]) ?? [];
  }

  const row = headers.map((h) => {
    const val = fields[h];
    if (val === null || val === undefined) return "";
    return String(val);
  });

  // Use column A to find the true last data row, avoiding gaps caused by
  // formula columns or stray content that make values.append skip rows.
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const nextRow = (colA.data.values ?? []).length + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${nextRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

/** Update specific cells in a row identified by a key column */
export async function updateRowByKey(
  sheetName: string,
  keyCol: string,
  keyVal: string,
  updates: Record<string, string | number | boolean | null | undefined>
): Promise<boolean> {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = res.data.values ?? [];
  if (rows.length < 1) return false;

  const headers = rows[0] as string[];
  const keyColIdx = headers.indexOf(keyCol);
  if (keyColIdx === -1) return false;

  // Find the row (1-indexed, +1 for header row)
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[keyColIdx] === keyVal);
  if (rowIdx === -1) return false;

  const sheetRowNum = rowIdx + 1; // 1-based

  // Build batch update requests
  const data: { range: string; values: string[][] }[] = [];

  for (const [field, value] of Object.entries(updates)) {
    const colIdx = headers.indexOf(field);
    if (colIdx === -1) continue;
    const colLetter = columnIndexToLetter(colIdx);
    data.push({
      range: `${sheetName}!${colLetter}${sheetRowNum}`,
      values: [[value === null || value === undefined ? "" : String(value)]],
    });
  }

  if (data.length === 0) return true;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return true;
}

/** Count existing rows to get next sequence number */
export async function getNextSeq(sheetName: string): Promise<number> {
  const rows = await readSheet(sheetName);
  return rows.length + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function columnIndexToLetter(idx: number): string {
  let letter = "";
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function nowTimestamp(): string {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
