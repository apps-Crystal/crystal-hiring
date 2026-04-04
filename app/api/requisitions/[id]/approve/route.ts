import { NextRequest, NextResponse } from "next/server";
import { updateRowByKey, nowTimestamp } from "@/lib/sheets";
import { getSession, canApproveRequisition } from "@/lib/auth";
import { sendRequisitionDecision } from "@/lib/email";
import { getEmailList } from "@/lib/config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApproveRequisition(session.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const { decision, remarks } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const newStatus = decision === "APPROVED" ? "OPEN" : "REJECTED";

  await updateRowByKey("Requisition Form", "Requisition Id", id, {
    "Requisition Status": newStatus,
    "Approved By": session.name,
    "Approved Date": nowTimestamp(),
    "Approval Remarks": remarks ?? "",
  });

  // Notify the raiser
  try {
    const hrList = await getEmailList("HR_EXEC_LIST");
    if (hrList.length > 0) {
      await sendRequisitionDecision({
        to: hrList,
        reqId: id,
        position: "",
        decision: decision as "APPROVED" | "REJECTED",
        approvedBy: session.name,
        remarks: remarks ?? "",
      });
    }
  } catch (e) {
    console.error("[Approve] Email failed:", e);
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
