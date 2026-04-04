import { NextRequest, NextResponse } from "next/server";
import { findRow, updateRowByKey } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { transcribeAudio, evaluateCandidate } from "@/lib/ai";
import { getCultureGoals } from "@/lib/config";
import { sendScreeningComplete } from "@/lib/email";
import { getEmailList } from "@/lib/config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get candidate + requisition data
  const candidate = await findRow("Screening", "Screening ID", id);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const reqId = candidate["Requisition Id"];
  const { findRow: fr } = await import("@/lib/sheets");
  const req_ = await fr("Requisition Form", "Requisition Id", reqId);

  if (!req_) return NextResponse.json({ error: "Requisition not found" }, { status: 404 });

  // Mark as in progress
  await updateRowByKey("Screening", "Screening ID", id, {
    "AI Evaluation Status": "IN_PROGRESS",
  });

  try {
    // Transcribe call recording if available
    let transcript = "";
    const recordingUrl = candidate["Upload Call Recordings:"];
    if (recordingUrl) {
      try {
        // Fetch the file and convert to base64
        const fileRes = await fetch(recordingUrl);
        const arrayBuf = await fileRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString("base64");
        const mimeType = fileRes.headers.get("content-type") ?? "audio/mpeg";
        transcript = await transcribeAudio(base64, mimeType);
      } catch (e) {
        console.error("[Evaluate] Transcription failed:", e);
        transcript = candidate["Screening Remarks"] ?? "";
      }
    } else {
      transcript = candidate["Screening Remarks"] ?? "";
    }

    // Get culture goals
    const cultureGoals = await getCultureGoals();

    // Run AI evaluation
    const evaluation = await evaluateCandidate({
      transcript,
      question1: req_["AI Question 1"] ?? "",
      question2: req_["AI Question 2"] ?? "",
      question3: req_["AI Question 3"] ?? "",
      cultureGoals,
      hrDecision: candidate["Overall Candidate Fit Assessment"] ?? "",
      screeningNotes: candidate["Screening Remarks"] ?? "",
      positionTitle: candidate["Position Screened for"] ?? "",
    });

    // Write AI results back to sheet
    await updateRowByKey("Screening", "Screening ID", id, {
      "AI Technical Score": String(evaluation.technicalScore),
      "AI Culture Score": String(evaluation.cultureScore),
      "AI Validation Flag": evaluation.validationFlag,
      "AI Validation Reason": evaluation.validationReason,
      "AI Strengths": evaluation.strengths,
      "AI Risk Flags": evaluation.riskFlags,
      "Call Transcript": transcript.substring(0, 5000), // truncate for sheet
      "AI Evaluation Status": "COMPLETED",
    });

    // Notify HR Senior / TA Head
    try {
      const notifyList = await getEmailList("SCREENING_NOTIFY");
      if (notifyList.length > 0) {
        await sendScreeningComplete({
          to: notifyList,
          screeningId: id,
          candidateName: candidate["Candidate Name"] ?? "",
          position: candidate["Position Screened for"] ?? "",
          hrDecision: candidate["Overall Candidate Fit Assessment"] ?? "",
          aiTechScore: String(evaluation.technicalScore),
          aiCultureScore: String(evaluation.cultureScore),
          aiFlag: evaluation.validationFlag,
        });
      }
    } catch (e) {
      console.error("[Evaluate] Email notification failed:", e);
    }

    return NextResponse.json({ evaluation });
  } catch (e) {
    console.error("[Evaluate] AI evaluation failed:", e);
    await updateRowByKey("Screening", "Screening ID", id, {
      "AI Evaluation Status": "FAILED",
    });
    return NextResponse.json({ error: "AI evaluation failed" }, { status: 500 });
  }
}
