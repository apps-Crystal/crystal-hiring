import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { signInterviewToken } from "@/lib/auth";
import { sendInterviewToken } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const screeningId = req.nextUrl.searchParams.get("screeningId");

  let rows: Record<string, string>[] = [];
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );
    rows = await Promise.race([readSheet("Interview Form"), timeout]);
  } catch (err) {
    console.error("[interviews GET] failed:", err);
    return NextResponse.json({ interviews: [] });
  }

  let filtered = rows;
  if (screeningId) {
    const decoded = decodeURIComponent(screeningId);
    filtered = filtered.filter(
      (r) => r["Screening ID (Auto)"] === decoded || r["Screening ID (Auto)"] === screeningId
    );
  }
  filtered.sort((a, b) => (b["Timestamp"] ?? "").localeCompare(a["Timestamp"] ?? ""));

  return NextResponse.json({ interviews: filtered });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ts = nowTimestamp();

  const commonFields = {
    "Timestamp": ts,
    "Email address": session.email,
    "Screening ID (Auto)": body.screeningId ?? "",
    "Candidate Name (Auto)": body.candidateName ?? "",
    "Candidate Mail ID (Auto)": body.candidateEmail ?? "",
    "Position Screened For (Auto)": body.position ?? "",
    "Interview for Round": body.round ?? "",
    "Date (dd / mm /yy)": body.interviewDate
      ? new Date(body.interviewDate).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN"),
    "Column 1": body.interviewMode ?? "",
    "Column 2": body.interviewLocation ?? "",
  };

  try {
    const withTimeout = <T>(p: Promise<T>, ms = 10000): Promise<T> =>
      Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error(`Timed out after ${ms}ms`)), ms))]);

    // Platform-based interview submission
    if (body.type === "platform") {
      await withTimeout(appendRowByFields("Interview Form", {
        ...commonFields,
        "Interviewed By": body.interviewerName || session.name,
        "Interviewer Feedback": body.feedback ?? "",
        "Final Decision": body.decision ?? "",
        "Upload Recording:": body.recordingUrl ?? "",
      }));
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

      await withTimeout(appendRowByFields("Interview Form", {
        ...commonFields,
        "Interviewed By": body.interviewerName ?? "",
        "Final Decision": "PENDING",
        "Token": token,
        "Token Used": "false",
      }));

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

  } catch (err) {
    console.error("[interviews POST] failed:", err);
    return NextResponse.json(
      { error: "Failed to save interview", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
