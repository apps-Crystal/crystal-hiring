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

const meta = await sheets.spreadsheets.get({ spreadsheetId: ID, fields: "spreadsheetId,properties.title" });
console.log("📄 Spreadsheet Title:", meta.data.properties.title);
console.log("📄 Spreadsheet ID:   ", meta.data.spreadsheetId);
console.log("🔗 URL: https://docs.google.com/spreadsheets/d/" + meta.data.spreadsheetId);

// Check current AI Evaluation Status for CRPL1666
const res = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: "Screening" });
const rows = res.data.values ?? [];
const headers = rows[0];
const sidIdx = headers.indexOf("Screening ID");
const aiIdx = headers.indexOf("AI Evaluation Status");
const techIdx = headers.indexOf("AI Technical Score");

const target = rows.find((r, i) => i > 0 && r[sidIdx] === "EMP/2026/CRPL1666");
if (target) {
  console.log("\nEMP/2026/CRPL1666 in THIS sheet:");
  console.log("  AI Evaluation Status:", target[aiIdx] ?? "(empty)");
  console.log("  AI Technical Score:", target[techIdx] ?? "(empty)");
} else {
  console.log("\nEMP/2026/CRPL1666 NOT FOUND in this sheet");
}
