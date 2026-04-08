/**
 * setup-shared-drive.mjs
 * Run: node scripts/setup-shared-drive.mjs
 *
 * Creates a "Crystal Hiring" Shared Drive, adds the service account as
 * Content Manager, then prints the ID to paste into .env.local.
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  process.env[key] = val;
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

async function main() {
  console.log("🔍 Checking existing shared drives accessible to service account...\n");

  // List any existing shared drives the service account can see
  const listRes = await drive.drives.list({ pageSize: 20 });
  const existing = listRes.data.drives ?? [];

  if (existing.length > 0) {
    console.log("✅ Found existing shared drives:");
    for (const d of existing) {
      console.log(`   • ${d.name}  →  ID: ${d.id}`);
    }
    console.log("\nTo use one of these, set in .env.local:");
    console.log(`   GOOGLE_DRIVE_ROOT_FOLDER_ID=<ID from above>\n`);
    console.log("Then restart: npm run dev\n");
    return;
  }

  console.log("No shared drives found via service account. Creating one...\n");

  // Create a new Shared Drive
  const requestId = crypto.randomUUID();
  const createRes = await drive.drives.create({
    requestBody: { name: "Crystal Hiring" },
    requestId,
  });

  const driveId = createRes.data.id;
  console.log(`✅ Shared Drive created: "Crystal Hiring"  →  ID: ${driveId}\n`);

  // Add service account as Content Manager of the drive
  await drive.permissions.create({
    fileId: driveId,
    supportsAllDrives: true,
    requestBody: {
      role: "fileOrganizer",
      type: "user",
      emailAddress: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    },
  });

  console.log(`✅ Service account added as Content Manager\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Update .env.local with:");
  console.log(`   GOOGLE_DRIVE_ROOT_FOLDER_ID=${driveId}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nThen restart: npm run dev\n");

  // Auto-patch .env.local
  const updatedEnv = envContent.replace(
    /^GOOGLE_DRIVE_ROOT_FOLDER_ID=.*/m,
    `GOOGLE_DRIVE_ROOT_FOLDER_ID=${driveId}`
  );
  const { writeFileSync } = await import("fs");
  writeFileSync(envPath, updatedEnv);
  console.log("✅ .env.local updated automatically!\n");
}

main().catch((e) => {
  console.error("❌ Error:", e.message ?? e);
  process.exit(1);
});
