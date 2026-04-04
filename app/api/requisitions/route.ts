import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, getNextSeq, generateReqId, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { generateInterviewQuestions } from "@/lib/ai";
import { sendRequisitionNotification } from "@/lib/email";
import { getEmailList } from "@/lib/config";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await readSheet("Requisition Form");
  const status = req.nextUrl.searchParams.get("status");
  const dept = req.nextUrl.searchParams.get("dept");

  let filtered = rows;
  if (status) filtered = filtered.filter((r) => r["Requisition Status"] === status);
  if (dept)   filtered = filtered.filter((r) => r["Department"] === dept);

  // Sort newest first
  filtered.sort((a, b) => (b["Timestamp"] ?? "").localeCompare(a["Timestamp"] ?? ""));

  return NextResponse.json({ requisitions: filtered });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const seq = await getNextSeq("Requisition Form");
    const reqId = generateReqId(seq);
    const ts = nowTimestamp();

    // Generate AI questions
    let q1 = "", q2 = "", q3 = "";
    try {
      const questions = await generateInterviewQuestions({
        positionTitle: body.positionTitle ?? "",
        keyResponsibilities: body.coreResponsibilities ?? "",
        keySkills: body.keySkills ?? "",
        experience: body.experience ?? "",
      });
      q1 = questions.question1;
      q2 = questions.question2;
      q3 = questions.question3;
    } catch (e) {
      console.error("[Requisition] AI question generation failed:", e);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const screeningLink = `${appUrl}/dashboard/screening/new?reqId=${reqId}`;

    await appendRowByFields("Requisition Form", {
      "Timestamp": ts,
      "Requisition Id": reqId,
      "Position Title": body.positionTitle ?? "",
      "Department": body.department ?? "",
      "Job Type": body.jobType ?? "",
      "Total Nos Required": body.totalNos ?? "",
      "Location": body.location ?? "",
      "Reporting Manager": body.reportingManager ?? "",
      "Required Years of Experience": body.experience ?? "",
      "Required/Ideal Educational Qualification": body.qualification ?? "",
      "Salary Range": body.salaryRange ?? "",
      "Preferred Joining Date": body.preferredJoiningDate ?? "",
      "Key Skills Required": body.keySkills ?? "",
      "Core Responsibilities of the Position": body.coreResponsibilities ?? "",
      "Preferred Filters / Candidate Features": body.preferredFilters ?? "",
      "JD UPLOADING": body.jdUrl ?? "",
      "Business Justification": body.businessJustification ?? "",
      "Requisition Status": "PENDING_APPROVAL",
      "AI Question 1": q1,
      "AI Question 2": q2,
      "AI Question 3": q3,
      "Raised By": session.name,
      "Email address": session.email,
      "screening prefilled form link": screeningLink,
    });

    // Notify CHRO + TA Head
    try {
      const approvers = await getEmailList("REQUISITION_APPROVERS");
      if (approvers.length > 0) {
        await sendRequisitionNotification({
          to: approvers,
          reqId,
          position: body.positionTitle ?? "",
          department: body.department ?? "",
          raisedBy: session.name,
          location: body.location ?? "",
          openings: body.totalNos ?? "",
        });
      }
    } catch (e) {
      console.error("[Requisition] Email notification failed:", e);
    }

    return NextResponse.json({ reqId, questions: { q1, q2, q3 } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Requisition POST] Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
