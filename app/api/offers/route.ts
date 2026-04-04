import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, findRow, updateRowByKey, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { sendOfferApprovalRequest } from "@/lib/email";
import { getEmailList } from "@/lib/config";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await readSheet("Offer Approval Request");
  const screeningId = req.nextUrl.searchParams.get("screeningId");

  if (screeningId) {
    const offer = rows.find((r) => r["Screening ID (Auto)"] === screeningId);
    return NextResponse.json({ offer: offer ?? null });
  }

  rows.sort((a, b) => (b["Timestamp"] ?? "").localeCompare(a["Timestamp"] ?? ""));
  return NextResponse.json({ offers: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ts = nowTimestamp();

  const screeningId = body.screeningId;
  const candidate = await findRow("Screening", "Screening ID", screeningId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // Get document URLs
  const doc = await findRow("Documents Collection", "Screening ID (For internal use only)", screeningId);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const approvalLink = `${appUrl}/dashboard/offers/${screeningId}`;

  await appendRowByFields("Offer Approval Request", {
    "Timestamp": ts,
    "Email address": session.email,
    "Candidate Name (Auto)": candidate["Candidate Name"] ?? "",
    "Screening ID (Auto)": screeningId,
    "Designation to be Offered": body.designation ?? "",
    "Interview Feedback": body.interviewSummary ?? "",
    "Years Of Experience": candidate["Total Years of Experience"] ?? "",
    "Location": candidate["Job location?"] ?? "",
    "Current CTC": candidate["Current CTC (In Lakhs)"] ?? "",
    "Expected CTC": candidate["Expected CTC (In Lakhs)"] ?? "",
    "Final Salary CTC Amount (In Lakhs)": body.finalCTC ?? "",
    "Date of Joining": body.doj ?? "",
    "Proceed with Offer Letter Generation": "Yes",
    "Remarks": body.remarks ?? "",
    "Contact Number": candidate["Phone Number"] ?? "",
    "Notice Period": candidate["Notice Period"] ?? "",
    "Document Collection Done Successfully ?": body.docsComplete ? "Yes" : "No",
    "Candidate ID proof URL": doc?.["ID proof"] ?? "",
    "Candidate Degree certificate(s) URL": doc?.["Degree certificate(s)"] ?? "",
    "Candidate Latest CV URL": doc?.["Latest CV"] ?? "",
    "Candidate Appointment letter from your current/last employer URL": doc?.["Appointment letter from your current/last employer"] ?? "",
    "Candidate Last three months' pay slips URL": doc?.["Last three months' pay slips"] ?? "",
    "% Hike Given": body.hikePercent ?? "",
    "Management Offer Approval prefilled form link": approvalLink,
    "Date (dd/mm/yy)": new Date().toLocaleDateString("en-IN"),
    "Reporting Manager": body.reportingManager ?? "",
    "Offer Request Status": "PENDING_APPROVAL",
    "Raised By": session.name,
  });

  // Update candidate stage
  await updateRowByKey("Screening", "Screening ID", screeningId, {
    "Stage": "OFFER",
  });

  // Notify approvers
  try {
    const approvers = await getEmailList("OFFER_APPROVERS");
    if (approvers.length > 0) {
      await sendOfferApprovalRequest({
        to: approvers,
        candidateName: candidate["Candidate Name"] ?? "",
        screeningId,
        position: candidate["Position Screened for"] ?? "",
        finalCTC: body.finalCTC ?? "",
        doj: body.doj ?? "",
        approvalLink,
      });
    }
  } catch (e) {
    console.error("[Offers] Email failed:", e);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
