import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, findRow, updateRowByKey, nowTimestamp } from "@/lib/sheets";
import { getSession, signApprovalToken } from "@/lib/auth";
import { sendOfferApprovalRequest } from "@/lib/email";
import { getEmailList } from "@/lib/config";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read all 3 sheets in parallel so we can derive the current status of
  // each offer without depending on extra columns in the request sheet.
  const [rows, decisions, issued] = await Promise.all([
    readSheet("Offer Approval Request"),
    readSheet("Management Offer Approval Form"),
    readSheet("Issue Offer Form"),
  ]);

  // Build lookup: Screening ID → latest approval decision (normalized to
  // uppercase so "Approved" / "APPROVED" / "approved" all map to "APPROVED").
  const latestDecision = new Map<string, string>();
  for (const d of decisions) {
    const sid = (d["Screening ID (Auto)"] ?? "").trim();
    const raw = (d["Approval Decision"] ?? "").trim().toUpperCase();
    // Map common variations to canonical values
    let decision = raw;
    if (raw === "APPROVE" || raw === "APPROVED") decision = "APPROVED";
    else if (raw === "REJECT" || raw === "REJECTED") decision = "REJECTED";
    else if (raw === "HOLD" || raw === "ON HOLD") decision = "HOLD";
    if (sid && decision) latestDecision.set(sid, decision); // later rows win
  }

  // Build lookup: Screening ID → offer letter issued?
  const issuedSet = new Set<string>();
  for (const i of issued) {
    const sid = (i["Screening ID (Auto)"] ?? "").trim();
    if (sid) issuedSet.add(sid);
  }

  const enriched = rows.map((r) => {
    const sid = (r["Screening ID (Auto)"] ?? "").trim();
    const decision = latestDecision.get(sid) ?? "";
    const wasIssued = issuedSet.has(sid);
    return {
      ...r,
      "Offer Request Status": decision || "PENDING_APPROVAL",
      "Offer Letter Issued": wasIssued ? "Yes" : "",
    };
  });

  const screeningId = req.nextUrl.searchParams.get("screeningId");
  if (screeningId) {
    const offer = enriched.find((r) => r["Screening ID (Auto)"] === screeningId);
    return NextResponse.json({ offer: offer ?? null });
  }

  enriched.sort((a, b) => (b["Timestamp"] ?? "").localeCompare(a["Timestamp"] ?? ""));
  return NextResponse.json({ offers: enriched });
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
  const approvalToken = await signApprovalToken({
    screeningId,
    candidateName: candidate["Candidate Name"] ?? "",
    position: candidate["Position Screened for"] ?? "",
    type: "approval_token",
  });
  const approvalLink = `${appUrl}/offers/approve/${approvalToken}`;

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
