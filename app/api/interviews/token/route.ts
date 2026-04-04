import { NextRequest, NextResponse } from "next/server";
import { verifyInterviewToken } from "@/lib/auth";
import { findRow, appendRowByFields, nowTimestamp } from "@/lib/sheets";

// GET: Verify token and return candidate info
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const payload = await verifyInterviewToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

  const candidate = await findRow("Screening", "Screening ID", payload.screeningId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // Get previous interview rounds
  const { readSheet } = await import("@/lib/sheets");
  const allInterviews = await readSheet("Interview Form");
  const priorRounds = allInterviews.filter(
    (r) => r["Screening ID (Auto)"] === payload.screeningId
  );

  return NextResponse.json({
    payload,
    candidate: {
      name: candidate["Candidate Name"],
      position: candidate["Position Screened for"],
      experience: candidate["Total Years of Experience"],
      aiTechScore: candidate["AI Technical Score"],
      aiCultureScore: candidate["AI Culture Score"],
      // No salary
    },
    priorRounds: priorRounds.map((r) => ({
      round: r["Interview for Round"],
      interviewedBy: r["Interviewed By"],
      feedback: r["Interviewer Feedback"],
      decision: r["Final Decision"],
      date: r["Date (dd / mm /yy)"],
    })),
  });
}

// POST: Submit interview feedback via token
export async function POST(req: NextRequest) {
  const { token, feedback, decision, recordingUrl } = await req.json();

  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const payload = await verifyInterviewToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

  const candidate = await findRow("Screening", "Screening ID", payload.screeningId);

  await appendRowByFields("Interview Form", {
    "Timestamp": nowTimestamp(),
    "Interviewed By": payload.interviewerName,
    "Screening ID (Auto)": payload.screeningId,
    "Candidate Name (Auto)": candidate?.["Candidate Name"] ?? "",
    "Candidate Mail ID (Auto)": candidate?.["Email Id"] ?? "",
    "Position Screened For (Auto)": candidate?.["Position Screened for"] ?? "",
    "Interview for Round": payload.round,
    "Interviewer Feedback": feedback ?? "",
    "Final Decision": decision ?? "",
    "Upload Recording:": recordingUrl ?? "",
    "Token": token,
    "Token Used": "YES",
    "Date (dd / mm /yy)": new Date().toLocaleDateString("en-IN"),
  });

  return NextResponse.json({ ok: true });
}
