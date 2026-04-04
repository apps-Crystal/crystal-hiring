import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { signInterviewToken } from "@/lib/auth";
import { sendInterviewToken } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await readSheet("Interview Form");
  const screeningId = req.nextUrl.searchParams.get("screeningId");

  let filtered = rows;
  if (screeningId) {
    filtered = filtered.filter((r) => r["Screening ID (Auto)"] === screeningId);
  }
  filtered.sort((a, b) => (b["Timestamp"] ?? "").localeCompare(a["Timestamp"] ?? ""));

  return NextResponse.json({ interviews: filtered });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ts = nowTimestamp();

  // Platform-based interview submission
  if (body.type === "platform") {
    await appendRowByFields("Interview Form", {
      "Timestamp": ts,
      "Interviewed By": session.name,
      "Email address": session.email,
      "Screening ID (Auto)": body.screeningId ?? "",
      "Candidate Name (Auto)": body.candidateName ?? "",
      "Candidate Mail ID (Auto)": body.candidateEmail ?? "",
      "Position Screened For (Auto)": body.position ?? "",
      "Interview for Round": body.round ?? "",
      "Interviewer Feedback": body.feedback ?? "",
      "Final Decision": body.decision ?? "",
      "Upload Recording:": body.recordingUrl ?? "",
      "Current CTC": body.currentCTC ?? "",
      "Expected CTC": body.expectedCTC ?? "",
      "Date (dd / mm /yy)": new Date().toLocaleDateString("en-IN"),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // Token-based: generate token link and email to external interviewer
  if (body.type === "token") {
    const tokenPayload = {
      screeningId: body.screeningId,
      interviewerName: body.interviewerName ?? "",
      round: body.round ?? "",
      type: "interview_token" as const,
    };

    const token = await signInterviewToken(tokenPayload);

    try {
      await sendInterviewToken({
        to: body.interviewerEmail,
        interviewerName: body.interviewerName ?? "",
        candidateName: body.candidateName ?? "",
        position: body.position ?? "",
        round: body.round ?? "",
        token,
      });
    } catch (e) {
      console.error("[Interview] Token email failed:", e);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({ token, link: `${appUrl}/interview/${token}` }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
