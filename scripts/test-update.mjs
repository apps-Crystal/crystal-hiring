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
const ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

const TARGET = "EMP/2026/CRPL1665";
const SHEET = "Screening";

const res = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: SHEET });
const rows = res.data.values ?? [];
const headers = rows[0];

// Trim ALL headers exactly like readSheet does
const trimmedHeaders = headers.map(h => h?.trim() ?? "");

const sidIdx = trimmedHeaders.indexOf("Screening ID");
const aiStatusIdx = trimmedHeaders.indexOf("AI Evaluation Status");
const aiTechIdx = trimmedHeaders.indexOf("AI Technical Score");
const aiCultureIdx = trimmedHeaders.indexOf("AI Culture Score");

console.log("Screening ID col:", sidIdx, "| raw header:", JSON.stringify(headers[sidIdx]));
console.log("AI Evaluation Status col:", aiStatusIdx, "| raw header:", JSON.stringify(headers[aiStatusIdx]));
console.log("AI Technical Score col:", aiTechIdx, "| raw header:", JSON.stringify(headers[aiTechIdx]));
console.log("AI Culture Score col:", aiCultureIdx, "| raw header:", JSON.stringify(headers[aiCultureIdx]));

const rowIdx = rows.findIndex((r, i) => i > 0 && r[sidIdx] === TARGET);
console.log("\nrowIdx for", TARGET, ":", rowIdx, "→ sheet row", rowIdx + 1);

if (rowIdx === -1) { console.log("❌ Row not found"); process.exit(1); }

// Try writing directly
function colLetter(idx) {
  if (idx < 26) return String.fromCharCode(65 + idx);
  return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
}

const sheetRow = rowIdx + 1;
const writeData = [
  { range: `${SHEET}!${colLetter(aiStatusIdx)}${sheetRow}`, values: [["COMPLETED"]] },
  { range: `${SHEET}!${colLetter(aiTechIdx)}${sheetRow}`, values: [["7"]] },
  { range: `${SHEET}!${colLetter(aiCultureIdx)}${sheetRow}`, values: [["8"]] },
];

console.log("\nWriting to:", writeData.map(d => d.range));

try {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: ID,
    requestBody: { valueInputOption: "USER_ENTERED", data: writeData },
  });
  console.log("✅ Write succeeded!");
} catch (e) {
  console.error("❌ Write failed:", e.message);
}
