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
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

try {
  const res = await drive.files.get({
    fileId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    fields: "id,name,driveId,mimeType,capabilities",
    supportsAllDrives: true,
  });
  console.log("Folder info:", JSON.stringify(res.data, null, 2));
} catch (e) {
  console.error("Error:", e.message);
}

// Try creating a tiny test file
try {
  const { Readable } = await import("stream");
  const res2 = await drive.files.create({
    requestBody: {
      name: "_test_upload.txt",
      parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID],
    },
    media: { mimeType: "text/plain", body: Readable.from(["test"]) },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  }, { responseType: "json" });
  console.log("\n✅ Test upload SUCCESS:", res2.data);
  // Clean up
  await drive.files.delete({ fileId: res2.data.id, supportsAllDrives: true });
  console.log("✅ Test file deleted — Drive upload is working!");
} catch (e) {
  console.error("\n❌ Test upload FAILED:", e.message);
}
