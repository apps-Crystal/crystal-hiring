import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyDocumentToken } from "@/lib/auth";
import { findRow, updateRowByKey, nowTimestamp, invalidateCache } from "@/lib/sheets";
import { uploadFile, documentFolderPath } from "@/lib/drive";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const DOCS_SHEET = "Documents Collection";

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

/**
 * Append a row to a sheet by reading LIVE headers and matching fields by
 * trimmed header name. Resilient to trailing whitespace, duplicate columns,
 * extra columns, and schema drift.
 */
async function appendByLiveHeaders(
  sheetName: string,
  fields: Record<string, string>
): Promise<void> {
  const sheets = getSheetsClient();

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const liveHeaders = ((headerRes.data.values?.[0] as string[]) ?? []).map(h => h ?? "");

  // Build a fields map keyed by trimmed header for fuzzy matching.
  const trimmedFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    trimmedFields[k.trim()] = v;
  }

  const row = liveHeaders.map((h) => {
    const trimmed = (h ?? "").trim();
    return trimmedFields[trimmed] ?? "";
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  invalidateCache(sheetName);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await verifyDocumentToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  const candidate = await findRow("Screening", "Screening ID", payload.screeningId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json({
    screeningId: payload.screeningId,
    candidateName: candidate["Candidate Name"] ?? payload.candidateName,
    position: candidate["Position Screened for"] ?? payload.position,
    email: candidate["Email Id"] ?? "",
    phone: candidate["Phone Number"] ?? "",
    location: candidate["Job location?"] ?? "",
    currentCTC: candidate["Current CTC (In Lakhs)"] ?? "",
  });
}

const FIELDS = ["idProof", "degree", "appointment", "paySlips", "cv"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = await verifyDocumentToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    const formData = await req.formData();
    const fullName = (formData.get("fullName") as string) ?? "";
    const phone = (formData.get("phone") as string) ?? "";
    const email = (formData.get("email") as string) ?? "";
    const location = (formData.get("location") as string) ?? "";
    const currentCTC = (formData.get("currentCTC") as string) ?? "";
    const confirmed = (formData.get("confirmed") as string) === "true";

    if (!confirmed) {
      return NextResponse.json({ error: "You must confirm document authenticity" }, { status: 400 });
    }

    console.log(`[DocsPublic] Submission from ${payload.screeningId} — ${fullName}`);

    const MAX_SIZE = 10 * 1024 * 1024;
    const folderPath = documentFolderPath(payload.screeningId);

    // Upload files — continue even if one fails, record error
    const urls: Record<string, string> = {};
    const uploadErrors: string[] = [];
    for (const key of FIELDS) {
      const file = formData.get(key) as File | null;
      if (!file || file.size === 0) continue;
      if (file.size > MAX_SIZE) {
        uploadErrors.push(`${key}: exceeds 10MB`);
        continue;
      }
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { webViewLink } = await uploadFile(buffer, file.name, file.type, folderPath);
        urls[key] = webViewLink;
        console.log(`[DocsPublic] Uploaded ${key} → ${webViewLink}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[DocsPublic] Upload failed for ${key}:`, msg);
        uploadErrors.push(`${key}: ${msg}`);
      }
    }

    // Append the row — always attempt, even if some uploads failed
    try {
      await appendByLiveHeaders(DOCS_SHEET, {
        "Timestamp": nowTimestamp(),
        "Screening ID (For internal use only)": payload.screeningId,
        "Full Name": fullName,
        "Phone No.": phone,
        "Personal Email ID": email,
        "Position Screened For": payload.position,
        "Location of Hiring": location,
        "ID proof": urls.idProof ?? "",
        "Degree certificate(s)": urls.degree ?? "",
        "Appointment letter from your current/last employer": urls.appointment ?? "",
        "Last three months' pay slips": urls.paySlips ?? "",
        "Latest CV": urls.cv ?? "",
        "I confirm that the documents uploaded are authentic and true to the best of my knowledge.": "Yes",
        "Current CTC": currentCTC,
      });
      console.log(`[DocsPublic] Sheet row appended for ${payload.screeningId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[DocsPublic] Sheet append failed:", msg);
      return NextResponse.json(
        { error: `Failed to save submission: ${msg}`, uploadErrors },
        { status: 500 }
      );
    }

    // Best-effort stage update
    try {
      await updateRowByKey("Screening", "Screening ID", payload.screeningId, {
        "Stage": "DOCUMENTS_SUBMITTED",
      });
    } catch (e) {
      console.error("[DocsPublic] Stage update failed:", e);
    }

    return NextResponse.json({ ok: true, uploadErrors: uploadErrors.length ? uploadErrors : undefined });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[DocsPublic] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
