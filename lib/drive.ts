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
// DOWNLOAD
// ─────────────────────────────────────────────────────────────────────────────

/** Extract Drive file ID from common webViewLink / open URL shapes */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  // https://drive.google.com/file/d/<ID>/view
  const m1 = url.match(/\/file\/d\/([^/]+)/);
  if (m1) return m1[1];
  // https://drive.google.com/open?id=<ID>
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return m2[1];
  // https://drive.google.com/uc?id=<ID>
  return null;
}

export interface DownloadedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/** Search Drive for a file by exact name. Returns the first match. */
export async function findDriveFileByName(name: string): Promise<{ id: string; webViewLink: string; mimeType: string } | null> {
  if (!name) return null;
  const drive = getDriveClient();
  // Escape single quotes in name for the query string
  const safe = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${safe}' and trashed=false`,
    fields: "files(id, webViewLink, mimeType, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives",
    pageSize: 1,
  });
  const f = res.data.files?.[0];
  if (!f?.id) return null;
  return {
    id: f.id,
    webViewLink: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
    mimeType: f.mimeType ?? "application/octet-stream",
  };
}

/** Download a file by its Drive file ID */
export async function downloadDriveFileById(fileId: string): Promise<DownloadedFile | null> {
  const drive = getDriveClient();
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
    supportsAllDrives: true,
  });
  const mimeType = (meta.data as { mimeType?: string }).mimeType ?? "application/octet-stream";
  const fileName = (meta.data as { name?: string }).name ?? "file";
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return { buffer: Buffer.from(res.data as ArrayBuffer), mimeType, fileName };
}

export async function downloadDriveFileByUrl(url: string): Promise<DownloadedFile | null> {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;

  const drive = getDriveClient();

  // Get metadata first for mime type and name
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
    supportsAllDrives: true,
  });
  const mimeType = (meta.data as { mimeType?: string }).mimeType ?? "application/octet-stream";
  const fileName = (meta.data as { name?: string }).name ?? "file";

  // Download bytes
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  const buffer = Buffer.from(res.data as ArrayBuffer);
  return { buffer, mimeType, fileName };
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
