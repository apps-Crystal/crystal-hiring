import { NextRequest, NextResponse } from "next/server";
import { readSheetWithLinks, appendRowByFields, findRow, nowTimestamp } from "@/lib/sheets";
import { getSession, signDocumentToken } from "@/lib/auth";
import { sendDocumentRequest } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await readSheetWithLinks("Documents Collection");
  const screeningId = req.nextUrl.searchParams.get("screeningId");

  if (screeningId) {
    const doc = rows.find((r) => r["Screening ID (For internal use only)"] === screeningId);
    return NextResponse.json({ document: doc ?? null });
  }

  return NextResponse.json({ documents: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Request document collection from candidate
  if (body.type === "request") {
    const screeningId = body.screeningId;
    const candidate = await findRow("Screening", "Screening ID", screeningId);
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const token = await signDocumentToken({
      screeningId,
      candidateName: candidate["Candidate Name"] ?? "",
      position: candidate["Position Screened for"] ?? "",
      type: "document_token",
    });
    const uploadLink = `${appUrl}/documents/submit/${token}`;

    // Update stage
    const { updateRowByKey } = await import("@/lib/sheets");
    await updateRowByKey("Screening", "Screening ID", screeningId, {
      "Stage": "DOCUMENTS",
    });

    // Email candidate
    try {
      await sendDocumentRequest({
        to: candidate["Email Id"] ?? "",
        candidateName: candidate["Candidate Name"] ?? "",
        position: candidate["Position Screened for"] ?? "",
        uploadLink,
      });
    } catch (e) {
      console.error("[Documents] Email failed:", e);
    }

    return NextResponse.json({ uploadLink });
  }

  // Candidate submitting documents (no auth required for this flow, handled separately)
  const ts = nowTimestamp();
  await appendRowByFields("Documents Collection", {
    "Timestamp": ts,
    "Screening ID (For internal use only)": body.screeningId ?? "",
    "Full Name": body.fullName ?? "",
    "Phone No.": body.phone ?? "",
    "Personal Email ID": body.email ?? "",
    "Position Screened For": body.position ?? "",
    "Location of Hiring": body.location ?? "",
    "ID proof": body.idProofUrl ?? "",
    "Degree certificate(s)": body.degreeUrl ?? "",
    "Appointment letter from your current/last employer": body.appointmentUrl ?? "",
    "Last three months' pay slips": body.paySlipsUrl ?? "",
    "Latest CV": body.cvUrl ?? "",
    "I confirm that the documents uploaded are authentic and true to the best of my knowledge.": body.confirmed ? "Yes" : "No",
    "Current CTC": body.currentCTC ?? "",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
