/**
 * sheets.ts — Crystal Group AI-Powered Hiring System
 * All Google Sheets reads/writes go through this module.
 */

import { google } from "googleapis";
import { getSheetColumns } from "./sheet-schema";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON CLIENT — reuse across requests in the same Node.js process
// ─────────────────────────────────────────────────────────────────────────────

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENT CACHE — survives Next.js hot reloads in dev via globalThis
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

interface CacheEntry {
  data: Record<string, string>[];
  expiresAt: number;
}

// Attach to globalThis so the cache persists across Next.js hot module reloads
const g = globalThis as typeof globalThis & { __sheetsCache?: Map<string, CacheEntry> };
if (!g.__sheetsCache) g.__sheetsCache = new Map();
const _cache = g.__sheetsCache;

function getCached(key: string): Record<string, string>[] | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: Record<string, string>[]) {
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateCache(sheetName: string) {
  // Remove all cache keys related to this sheet
  for (const key of _cache.keys()) {
    if (key === sheetName || key.startsWith(`${sheetName}::`)) {
      _cache.delete(key);
    }
  }
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
  const cached = getCached(sheetName);
  if (cached) return cached;

  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });

    const rows = res.data.values ?? [];
    if (rows.length < 2) return [];

    const headers = (rows[0] as string[]).map((h) => h?.trim() ?? "");
    const result = rows.slice(1)
      .filter((row) => (row as string[]).some((cell) => cell?.trim() !== ""))
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = (row[i] as string) ?? "";
        });
        return obj;
      });

    setCache(sheetName, result);
    return result;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unable to parse range")) {
      console.warn(`[sheets] Sheet "${sheetName}" not found — returning [].`);
      return [];
    }
    throw err;
  }
}

/**
 * Read only specific columns from a sheet — much faster for large sheets.
 * Falls back to full readSheet if columns not found.
 */
export async function readSheetColumns(
  sheetName: string,
  columns: string[]
): Promise<Record<string, string>[]> {
  const cacheKey = `${sheetName}::${columns.sort().join(",")}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // First get headers to find column positions
  const sheets = getSheetsClient();
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = (headerRes.data.values?.[0] as string[]) ?? [];

  // Find which column letters we need
  const colIndexes = columns.map(c => headers.indexOf(c)).filter(i => i !== -1);
  const foundHeaders = colIndexes.map(i => headers[i]);

  if (colIndexes.length === 0) return readSheet(sheetName);

  // Build ranges like "Screening!A:A,Screening!C:C"
  const ranges = colIndexes.map(i => `${sheetName}!${columnIndexToLetter(i)}:${columnIndexToLetter(i)}`);

  const batchRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges,
  });

  const valueRanges = batchRes.data.valueRanges ?? [];
  const maxRows = Math.max(...valueRanges.map(vr => (vr.values?.length ?? 0)));

  const result: Record<string, string>[] = [];
  for (let r = 1; r < maxRows; r++) {
    const obj: Record<string, string> = {};
    let hasValue = false;
    foundHeaders.forEach((h, ci) => {
      const val = (valueRanges[ci]?.values?.[r]?.[0] as string) ?? "";
      obj[h] = val;
      if (val.trim()) hasValue = true;
    });
    if (hasValue) result.push(obj);
  }

  setCache(cacheKey, result);
  return result;
}

/** Read a single row by matching a key column value */
export async function findRow(
  sheetName: string,
  keyCol: string,
  keyVal: string
): Promise<Record<string, string> | null> {
  const rows = await readSheet(sheetName);
  const matches = rows.filter((r) => r[keyCol] === keyVal);
  return matches[matches.length - 1] ?? null;
}

/**
 * Warm the cache for a sheet in the background.
 */
export function warmCache(sheetName: string): void {
  if (!getCached(sheetName)) {
    readSheet(sheetName).catch(() => {});
  }
}

/**
 * Preload all frequently-used sheets in parallel at startup.
 * Call once from a layout or middleware.
 */
export function preloadCommonSheets(): void {
  // Stagger preloads to avoid Google Sheets API rate limits
  const sheets = ["Screening", "Requisition Form", "Interview Form"];
  sheets.forEach((s, i) => {
    setTimeout(() => warmCache(s), i * 800);
  });
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

  // Use append with INSERT_ROWS — auto-extends the sheet when it's full,
  // and always inserts at the true end regardless of formula columns.
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  invalidateCache(sheetName);
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

  // Find the LAST matching row (most recent submission wins over old duplicates)
  let rowIdx = -1;
  for (let i = rows.length - 1; i > 0; i--) {
    if (rows[i][keyColIdx] === keyVal) { rowIdx = i; break; }
  }
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

  invalidateCache(sheetName);
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
