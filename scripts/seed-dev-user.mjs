/**
 * seed-dev-user.mjs
 * Run: node scripts/seed-dev-user.mjs
 *
 * Creates a developer admin user in the USERS sheet.
 * Email: dev@crystalgroup.in
 * Password: Dev@1234
 */

import { google } from "googleapis";
import crypto from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    process.env[key.trim()] = rest.join("=").trim();
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // ── Ensure USERS sheet exists with headers ──────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetNames = meta.data.sheets.map((s) => s.properties.title);

  if (!sheetNames.includes("USERS")) {
    // Create the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "USERS" } } }],
      },
    });
    console.log("✅ Created USERS sheet");

    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "USERS!A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          "USER_ID", "FULL_NAME", "EMAIL", "PHONE",
          "ROLE", "DEPARTMENT", "STATUS",
          "PASSWORD_HASH", "FAILED_LOGIN_COUNT",
          "RESET_TOKEN", "RESET_TOKEN_EXPIRY",
          "CREATED_DATE", "LAST_LOGIN",
        ]],
      },
    });
    console.log("✅ Added USERS headers");
  } else {
    console.log("ℹ️  USERS sheet already exists");
  }

  // Also ensure CONFIG sheet exists
  if (!sheetNames.includes("CONFIG")) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "CONFIG" } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "CONFIG!A1",
      valueInputOption: "RAW",
      requestBody: { values: [["KEY", "VALUE", "UPDATED_BY", "UPDATED_DATE"]] },
    });
    console.log("✅ Created CONFIG sheet");
  }

  const users = [
    {
      USER_ID: "USR0001",
      FULL_NAME: "Dev Admin",
      EMAIL: "dev@crystalgroup.in",
      PASSWORD: "Dev@1234",
      ROLE: "CHRO",          // Full access
      DEPARTMENT: "IT",
      PHONE: "",
    },
    {
      USER_ID: "USR0002",
      FULL_NAME: "TA Head",
      EMAIL: "ta@crystalgroup.in",
      PASSWORD: "Dev@1234",
      ROLE: "TA_HEAD",
      DEPARTMENT: "HR",
      PHONE: "",
    },
    {
      USER_ID: "USR0003",
      FULL_NAME: "HR Executive",
      EMAIL: "hrexec@crystalgroup.in",
      PASSWORD: "Dev@1234",
      ROLE: "HR_EXEC",
      DEPARTMENT: "HR",
      PHONE: "",
    },
    {
      USER_ID: "USR0004",
      FULL_NAME: "HR Senior",
      EMAIL: "hrsenior@crystalgroup.in",
      PASSWORD: "Dev@1234",
      ROLE: "HR_SENIOR",
      DEPARTMENT: "HR",
      PHONE: "",
    },
    {
      USER_ID: "USR0005",
      FULL_NAME: "Management",
      EMAIL: "mgmt@crystalgroup.in",
      PASSWORD: "Dev@1234",
      ROLE: "MANAGEMENT",
      DEPARTMENT: "Management",
      PHONE: "",
    },
  ];

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const rows = users.map((u) => [
    u.USER_ID,
    u.FULL_NAME,
    u.EMAIL,
    u.PHONE,
    u.ROLE,
    u.DEPARTMENT,
    "ACTIVE",
    hashPassword(u.PASSWORD),
    "0",        // FAILED_LOGIN_COUNT
    "",         // RESET_TOKEN
    "",         // RESET_TOKEN_EXPIRY
    now,        // CREATED_DATE
    "",         // LAST_LOGIN
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "USERS",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  console.log("\n✅ Dev users seeded successfully!\n");
  console.log("┌─────────────────────────────────────────────────┐");
  console.log("│  Developer Login Credentials                    │");
  console.log("├───────────────┬───────────────────────┬─────────┤");
  console.log("│ Role          │ Email                 │ Password│");
  console.log("├───────────────┼───────────────────────┼─────────┤");
  users.forEach((u) => {
    const role  = u.ROLE.padEnd(13);
    const email = u.EMAIL.padEnd(21);
    console.log(`│ ${role} │ ${email} │ Dev@1234│`);
  });
  console.log("└───────────────┴───────────────────────┴─────────┘");
  console.log("\nAll users have password: Dev@1234\n");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
