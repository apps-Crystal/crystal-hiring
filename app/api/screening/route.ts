import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, getNextSeq, generateScreeningId, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await readSheet("Screening");

  const reqId  = req.nextUrl.searchParams.get("reqId");
  const stage  = req.nextUrl.searchParams.get("stage");
  const source = req.nextUrl.searchParams.get("source");
  const dept   = req.nextUrl.searchParams.get("dept");
  const decision = req.nextUrl.searchParams.get("decision");

  let filtered = rows;
  if (reqId)    filtered = filtered.filter((r) => r["Requisition Id"] === reqId);
  if (stage)    filtered = filtered.filter((r) => r["Stage"] === stage);
  if (source)   filtered = filtered.filter((r) => r["Source"] === source);
  if (decision) filtered = filtered.filter((r) => r["Overall Candidate Fit Assessment"] === decision);

  filtered.sort((a, b) => (b["Timestamp"] ?? "").localeCompare(a["Timestamp"] ?? ""));

  // Hide salary for HR Senior
  if (session.role === "HR_SENIOR") {
    filtered = filtered.map(({ "Current CTC (In Lakhs)": _c, "Expected CTC (In Lakhs)": _e, ...rest }) => rest);
  }

  return NextResponse.json({ candidates: filtered });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const seq = await getNextSeq("Screening");
  const screeningId = generateScreeningId(seq);
  const ts = nowTimestamp();

  await appendRowByFields("Screening", {
    "Timestamp": ts,
    "Date": new Date().toLocaleDateString("en-IN"),
    "Email address": session.email,
    "Requisition Id": body.reqId ?? "",
    "Screening ID": screeningId,
    "Candidate Name": body.candidateName ?? "",
    "Phone Number": body.phone ?? "",
    "Email Id": body.candidateEmail ?? "",
    "Job location?": body.jobLocation ?? "",
    "Position Screened for": body.position ?? "",
    "Total Years of Experience": body.experience ?? "",
    "Notice Period": body.noticePeriod ?? "",
    "Current CTC (In Lakhs)": body.currentCTC ?? "",
    "Expected CTC (In Lakhs)": body.expectedCTC ?? "",
    "Upload Resume:": body.resumeUrl ?? "",
    "Screening Remarks": body.screeningRemarks ?? "",
    "What knowledge / skills of the candidate align with the position's requirements ?": body.skillAlignment ?? "",
    "Is the candidate overall stable?": body.isStable ?? "",
    "Current Company Name, Designation, Working there since?": body.currentCompanyDetails ?? "",
    "Current Designation": body.currentDesignation ?? "",
    "Willing to Relocate?": body.willingToRelocate ?? "",
    "Available for Interview Date": body.availableDate ?? "",
    "Highest Qualification": body.qualification ?? "",
    "Key Skills": body.keySkills ?? "",
    "Computer Proficiency": body.computerProficiency ?? "",
    "Languages Known": body.languages ?? "",
    "Expected DOJ": body.expectedDOJ ?? "",
    "Red flags ( if any )": body.redFlags ?? "",
    "Timings Preference for Interview, if any": body.timingPreference ?? "",
    "Does the Candidate fit the basic Qualification and Job Requirements": body.fitsRequirements ?? "",
    "Overall Candidate Fit Assessment": body.hrDecision ?? "",
    "Interviewer Name": session.name,
    "Upload Call Recordings:": body.callRecordingUrl ?? "",
    "Source": body.source ?? "",
    "Position Name": body.position ?? "",
    "Location": body.jobLocation ?? "",
    "Stage": "SCREENED",
    "AI Evaluation Status": "PENDING",
  });

  return NextResponse.json({ screeningId }, { status: 201 });
}
