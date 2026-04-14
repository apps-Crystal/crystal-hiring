import { NextRequest, NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/auth";
import { findRow, updateRowByKey, appendRowByFields, nowTimestamp } from "@/lib/sheets";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await verifyApprovalToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired approval link" }, { status: 401 });
  }

  const candidate = await findRow("Screening", "Screening ID", payload.screeningId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const offer = await findRow("Offer Approval Request", "Screening ID (Auto)", payload.screeningId);
  if (!offer) return NextResponse.json({ error: "Offer request not found" }, { status: 404 });

  const interviews = (await import("@/lib/sheets")).readSheet;
  const allInterviews = await interviews("Interview Form");
  const rounds = allInterviews.filter(i => i["Screening ID (Auto)"] === payload.screeningId);

  return NextResponse.json({
    screeningId: payload.screeningId,
    candidateName: payload.candidateName,
    position: payload.position,
    offer: {
      designation: offer["Designation to be Offered"] ?? "",
      currentCTC: offer["Current CTC"] ?? "",
      expectedCTC: offer["Expected CTC"] ?? "",
      finalCTC: offer["Final Salary CTC Amount (In Lakhs)"] ?? "",
      doj: offer["Date of Joining"] ?? "",
      location: offer["Location"] ?? "",
      reportingManager: offer["Reporting Manager"] ?? "",
      interviewFeedback: offer["Interview Feedback"] ?? "",
      hikePercent: offer["% Hike Given"] ?? "",
      remarks: offer["Remarks"] ?? "",
      status: offer["Offer Request Status"] ?? "PENDING_APPROVAL",
    },
    candidate: {
      experience: candidate["Total Years of Experience"] ?? "",
      noticePeriod: candidate["Notice Period"] ?? "",
      currentCompany: candidate["Current Company Name, Designation, Working there since?"] ?? "",
      aiTechScore: candidate["AI Technical Score"] ?? "",
      aiCultureScore: candidate["AI Culture Score"] ?? "",
    },
    interviews: rounds.map(r => ({
      round: r["Interview for Round"] ?? "",
      interviewer: r["Interviewed By"] ?? "",
      decision: r["Final Decision"] ?? "",
      feedback: r["Interviewer Feedback"] ?? "",
      date: r["Date (dd / mm /yy)"] ?? r["Timestamp"] ?? "",
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = await verifyApprovalToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired approval link" }, { status: 401 });
    }

    const body = await req.json();
    const { decision, approvedCTC, remarks, approverName, approverDesignation } = body;

    if (!["APPROVED", "REJECTED", "HOLD"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    if (!approverName) {
      return NextResponse.json({ error: "Approver name required" }, { status: 400 });
    }

    const candidate = await findRow("Screening", "Screening ID", payload.screeningId);
    const offer = await findRow("Offer Approval Request", "Screening ID (Auto)", payload.screeningId);

    await updateRowByKey("Offer Approval Request", "Screening ID (Auto)", payload.screeningId, {
      "Offer Request Status": decision,
    });

    await appendRowByFields("Management Offer Approval Form", {
      "Timestamp": nowTimestamp(),
      "Candidate Name (Auto)": candidate?.["Candidate Name"] ?? "",
      "Screening ID (Auto)": payload.screeningId,
      "Offered Designation": offer?.["Designation to be Offered"] ?? "",
      "Proposed CTC": offer?.["Final Salary CTC Amount (In Lakhs)"] ?? "",
      "Approved CTC": approvedCTC ?? offer?.["Final Salary CTC Amount (In Lakhs)"] ?? "",
      "Date of Joining": offer?.["Date of Joining"] ?? "",
      "Reporting Manager": offer?.["Reporting Manager"] ?? "",
      "Remarks": remarks ?? "",
      "Approval Decision": decision,
      "Approver Name & Designation": `${approverName}${approverDesignation ? " — " + approverDesignation : ""}`,
      "Date": nowTimestamp(),
      "Interview Feedback": offer?.["Interview Feedback"] ?? "",
      "Current CTC": offer?.["Current CTC"] ?? "",
      "Expected CTC": offer?.["Expected CTC"] ?? "",
      "Final Negotiated Amount": approvedCTC ?? "",
      "Candidate ID proof URL": offer?.["Candidate ID proof URL"] ?? "",
      "Candidate Degree certificate(s) URL": offer?.["Candidate Degree certificate(s) URL"] ?? "",
      "Candidate Latest CV URL": offer?.["Candidate Latest CV URL"] ?? "",
      "Candidate Appointment letter from your current/last employer URL": offer?.["Candidate Appointment letter from your current/last employer URL"] ?? "",
      "Candidate Last three months' pay slips URL": offer?.["Candidate Last three months' pay slips URL"] ?? "",
      "On Requisition ID": candidate?.["Requisition Id"] ?? "",
      "candiate mail id": candidate?.["Email Id"] ?? "",
      "Approved By": approverName,
    });

    await updateRowByKey("Screening", "Screening ID", payload.screeningId, {
      "Stage": decision === "APPROVED" ? "OFFER_APPROVED" : decision === "REJECTED" ? "OFFER_REJECTED" : "OFFER",
    });

    return NextResponse.json({ ok: true, decision });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[OfferApprove] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
