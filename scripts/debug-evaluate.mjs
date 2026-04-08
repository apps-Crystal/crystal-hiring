import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
for (const line of env.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Read last 10 rows of Screening sheet
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: "Screening",
});

const rows = res.data.values ?? [];
const headers = rows[0];
console.log("Total rows:", rows.length);

// Find Screening ID column index
const sidIdx = headers.indexOf("Screening ID");
const aiStatusIdx = headers.indexOf("AI Evaluation Status");
const aiScoreIdx = headers.indexOf("AI Technical Score");
console.log("Screening ID col index:", sidIdx, "(col", String.fromCharCode(65+sidIdx) + ")");
console.log("AI Evaluation Status col index:", aiStatusIdx);
console.log("AI Technical Score col index:", aiScoreIdx);

// Show last 5 rows
console.log("\nLast 5 rows (Screening ID | AI Status | AI Tech Score):");
const last5 = rows.slice(-5);
for (const row of last5) {
  const sid = row[sidIdx] ?? "(empty)";
  const status = row[aiStatusIdx] ?? "(empty)";
  const score = row[aiScoreIdx] ?? "(empty)";
  console.log(" ", sid, "|", status, "|", score);
}

// Now simulate updateRowByKey for EMP/2026/CRPL1665
const TARGET = "EMP/2026/CRPL1665";
const rowIdx = rows.findIndex((r, i) => i > 0 && r[sidIdx] === TARGET);
console.log(`\nRow index for ${TARGET}:`, rowIdx, "(1-based sheet row:", rowIdx + 1, ")");
if (rowIdx === -1) {
  console.log("❌ Row NOT FOUND — this is why updateRowByKey silently fails");
  // Show what's actually in the Screening ID column for the last rows
  console.log("\nActual Screening ID values in last rows:");
  rows.slice(-6).forEach((r, i) => {
    console.log(` Row ${rows.length - 6 + i + 1}: "${r[sidIdx] ?? ''}"` );
  });
}
