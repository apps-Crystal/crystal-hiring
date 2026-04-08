/**
 * drive.ts — Crystal Group AI-Powered Hiring System
 * Google Drive file upload for resumes, recordings, documents.
 *
 * Folder structure under GOOGLE_DRIVE_ROOT_FOLDER_ID:
 *   HIRING/
 *     RESUMES/<SCREENING_ID>/
 *     RECORDINGS/<SCREENING_ID>/
 *     DOCUMENTS/<SCREENING_ID>/
 *     JD/<REQ_ID>/
 *     INTERVIEW_RECORDINGS/<SCREENING_ID>/
 *     BGV/
 */

import { google } from "googleapis";
import { Readable } from "stream";

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

function getDriveAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getDriveAuth() });
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();

  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id!;
}

async function getFolderPath(parts: string[]): Promise<string> {
  let parentId = ROOT_FOLDER_ID;
  for (const part of parts) {
    parentId = await getOrCreateFolder(part, parentId);
  }
  return parentId;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResult {
  fileId: string;
  webViewLink: string;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string[]
): Promise<UploadResult> {
  const drive = getDriveClient();
  const folderId = await getFolderPath(folderPath);

  const stream = Readable.from(buffer);

  const res = await drive.files.create(
    {
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    },
    { responseType: "json" }
  );

  const fileId = (res.data as { id: string }).id;
  const webViewLink = (res.data as { webViewLink?: string }).webViewLink
    ?? `https://drive.google.com/file/d/${fileId}/view`;

  // Make publicly viewable (anyone with link)
  await drive.permissions.create(
    {
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    },
    { responseType: "json" }
  );

  return { fileId, webViewLink };
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLDER PATH PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export function resumeFolderPath(screeningId: string): string[] {
  return ["HIRING", "RESUMES", screeningId];
}

export function callRecordingFolderPath(screeningId: string): string[] {
  return ["HIRING", "RECORDINGS", screeningId];
}

export function documentFolderPath(screeningId: string): string[] {
  return ["HIRING", "DOCUMENTS", screeningId];
}

export function jdFolderPath(reqId: string): string[] {
  return ["HIRING", "JD", reqId];
}

export function interviewRecordingFolderPath(screeningId: string): string[] {
  return ["HIRING", "INTERVIEW_RECORDINGS", screeningId];
}

export function bgvFolderPath(): string[] {
  return ["HIRING", "BGV"];
}
