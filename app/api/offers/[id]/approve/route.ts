import { NextRequest, NextResponse } from "next/server";
import { updateRowByKey, appendRowByFields, findRow, nowTimestamp } from "@/lib/sheets";
import { getSession, canApproveOffer } from "@/lib/auth";
import { sendOfferToCandidate } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApproveOffer(session.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params; // screeningId
  const body = await req.json();
  const { decision, approvedCTC, remarks, doj, designation } = body;

  // Update Offer Approval Request
  await updateRowByKey("Offer Approval Request", "Screening ID (Auto)", id, {
    "Offer Request Status": decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "HOLD",
  });

  // Append to Management Offer Approval Form
  const candidate = await findRow("Screening", "Screening ID", id);
  const offer = await findRow("Offer Approval Request", "Screening ID (Auto)", id);

  await appendRowByFields("Management Offer Approval Form", {
    "Timestamp": nowTimestamp(),
    "Candidate Name (Auto)": candidate?.["Candidate Name"] ?? "",
    "Screening ID (Auto)": id,
    "Offered Designation": designation ?? offer?.["Designation to be Offered"] ?? "",
    "Proposed CTC": offer?.["Final Salary CTC Amount (In Lakhs)"] ?? "",
    "Approved CTC": approvedCTC ?? "",
    "Date of Joining": doj ?? offer?.["Date of Joining"] ?? "",
    "Reporting Manager": offer?.["Reporting Manager"] ?? "",
    "Remarks": remarks ?? "",
    "Approval Decision": decision,
    "Approver Name & Designation": session.name,
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
    "Approved By": session.name,
  });

  // If approved, send offer to candidate
  if (decision === "APPROVED" && candidate?.["Email Id"]) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const signLink = `${appUrl}/offer/${id}`;

    try {
      await sendOfferToCandidate({
        to: candidate["Email Id"],
        candidateName: candidate["Candidate Name"] ?? "",
        position: candidate["Position Screened for"] ?? "",
        signLink,
        doj: doj ?? offer?.["Date of Joining"] ?? "",
      });
    } catch (e) {
      console.error("[OfferApprove] Candidate email failed:", e);
    }

    // Update stage to ACCEPTED (pending candidate sign)
    await updateRowByKey("Screening", "Screening ID", id, {
      "Stage": "OFFER",
    });
  }

  return NextResponse.json({ ok: true });
}
