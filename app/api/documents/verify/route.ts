import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findRow, findRowWithLinks, updateRowByKey } from "@/lib/sheets";
import { verifyDocuments, type DocumentFile } from "@/lib/ai";
import { downloadDriveFileByUrl, downloadDriveFileById, findDriveFileByName } from "@/lib/drive";

async function fetchDoc(value?: string): Promise<DocumentFile | undefined> {
  if (!value) return undefined;
  try {
    let dl = null;
    if (/^https?:\/\//i.test(value)) {
      dl = await downloadDriveFileByUrl(value);
    } else {
      // Plain filename — search Drive, then download by ID
      const found = await findDriveFileByName(value);
      if (found) dl = await downloadDriveFileById(found.id);
    }
    if (!dl) return undefined;
    // Guard against huge files — Gemini has a per-request size cap
    const MAX = 15 * 1024 * 1024;
    if (dl.buffer.byteLength > MAX) {
      console.warn(`[DocsVerify] Skipping oversized file: ${(dl as { fileName?: string }).fileName ?? "file"} (${dl.buffer.byteLength} bytes)`);
      return undefined;
    }
    return {
      base64: dl.buffer.toString("base64"),
      mimeType: dl.mimeType,
    };
  } catch (e) {
    console.error(`[DocsVerify] Failed to download "${value}":`, e);
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { screeningId } = await req.json();
    if (!screeningId) return NextResponse.json({ error: "screeningId required" }, { status: 400 });

    const candidate = await findRow("Screening", "Screening ID", screeningId);
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const doc = await findRowWithLinks("Documents Collection", "Screening ID (For internal use only)", screeningId);
    if (!doc) return NextResponse.json({ error: "No documents submitted yet" }, { status: 404 });

    console.log(`[DocsVerify] Downloading files for ${screeningId}…`);
    // Fetch all 5 files from Drive in parallel
    const [idProof, degree, appointmentLetter, paySlips, latestCV] = await Promise.all([
      fetchDoc(doc["ID proof"]),
      fetchDoc(doc["Degree certificate(s)"]),
      fetchDoc(doc["Appointment letter from your current/last employer"]),
      fetchDoc(doc["Last three months' pay slips"]),
      fetchDoc(doc["Latest CV"]),
    ]);

    const submittedCount = [idProof, degree, appointmentLetter, paySlips, latestCV].filter(Boolean).length;
    console.log(`[DocsVerify] Downloaded ${submittedCount}/5 files — running Gemini vision verification`);

    const result = await verifyDocuments({
      candidateName: candidate["Candidate Name"] ?? "",
      screeningData: {
        currentCompany: candidate["Current Company Name, Designation, Working there since?"] ?? "",
        currentRole: candidate["Current Designation"] ?? "",
        totalExperience: candidate["Total Years of Experience"] ?? "",
        currentCTC: candidate["Current CTC (In Lakhs)"] ?? "",
      },
      files: { idProof, degree, appointmentLetter, paySlips, latestCV },
    });

    // Compose a human-readable flags summary covering all 5 checks so TA Head
    // sees every document, even if the sheet only has 2 per-doc columns.
    const fullFlags = [
      `ID Proof: ${result.idProofCheck}`,
      `Degree: ${result.degreeCheck}`,
      `Appointment Letter: ${result.appointmentCheck}`,
      `Pay Slips: ${result.paySlipsCheck}`,
      `CV: ${result.cvCheck}`,
      result.flags ? `Flags: ${result.flags}` : "",
      result.recommendation ? `Recommendation: ${result.recommendation}` : "",
    ].filter(Boolean).join(" | ");

    await updateRowByKey(
      "Documents Collection",
      "Screening ID (For internal use only)",
      screeningId,
      {
        "AI Verification Status": result.status,
        "AI ID Proof Verification": result.idProofCheck,
        "AI CV Verification": result.cvCheck,
        "AI Verification Flags": fullFlags,
        // These 3 will be written only if the columns exist in the live sheet
        // (harmless no-op otherwise). Add them at the end of the sheet to enable.
        "AI Degree Verification": result.degreeCheck,
        "AI Appointment Letter Verification": result.appointmentCheck,
        "AI Pay Slips Verification": result.paySlipsCheck,
      }
    );

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DocsVerify] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // TA Head marks docs manually verified / flagged
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { screeningId, status } = await req.json();
    if (!screeningId || !status) {
      return NextResponse.json({ error: "screeningId and status required" }, { status: 400 });
    }

    await updateRowByKey(
      "Documents Collection",
      "Screening ID (For internal use only)",
      screeningId,
      {
        "Verification Complete": status === "VERIFIED" ? "Yes" : "No",
        "Verified By": session.name,
        "Verified Date": new Date().toLocaleDateString("en-IN"),
      }
    );

    if (status === "VERIFIED") {
      await updateRowByKey("Screening", "Screening ID", screeningId, {
        "Stage": "DOCUMENTS_VERIFIED",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
