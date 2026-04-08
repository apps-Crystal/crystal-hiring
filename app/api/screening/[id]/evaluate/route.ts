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
  const decodedId = decodeURIComponent(id);
  console.log("[Evaluate] id from params:", JSON.stringify(id));
  console.log("[Evaluate] decoded id:", JSON.stringify(decodedId));

  // Get candidate + requisition data
  const candidate = await findRow("Screening", "Screening ID", decodedId);
  console.log("[Evaluate] findRow result:", candidate ? "FOUND" : "NOT FOUND");
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const reqId = candidate["Requisition Id"];
  const { findRow: fr } = await import("@/lib/sheets");
  // Requisition is optional — evaluation can still run on candidate data alone
  const req_ = (await fr("Requisition Form", "Requisition Id", reqId)) ?? {};

  // Mark as in progress
  const inProgressResult = await updateRowByKey("Screening", "Screening ID", decodedId, {
    "AI Evaluation Status": "IN_PROGRESS",
  });
  console.log("[Evaluate] IN_PROGRESS update result:", inProgressResult);

  try {
    // Transcribe call recording if available, otherwise proceed without it
    let transcript = "";
    const recordingUrl = (candidate["Upload Call Recordings:"] ?? "").trim();
    if (recordingUrl) {
      try {
        const fileRes = await fetch(recordingUrl);
        const arrayBuf = await fileRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString("base64");
        const mimeType = fileRes.headers.get("content-type") ?? "audio/mpeg";
        transcript = await transcribeAudio(base64, mimeType);
      } catch (e) {
        console.error("[Evaluate] Transcription failed, falling back to notes:", e);
        transcript = "";
      }
    }
    // Always falls through — evaluateCandidate handles the no-transcript case internally

    // Get culture goals
    const cultureGoals = await getCultureGoals();

    // Build available candidate data for evaluation
    const candidateData = [
      candidate["Key Skills"] ? `Key Skills: ${candidate["Key Skills"]}` : "",
      candidate["Total Years of Experience"] ? `Experience: ${candidate["Total Years of Experience"]}` : "",
      candidate["Highest Qualification"] ? `Qualification: ${candidate["Highest Qualification"]}` : "",
      candidate["Current Company Name, Designation, Working there since?"] ? `Current Company: ${candidate["Current Company Name, Designation, Working there since?"]}` : "",
      candidate["Current Designation"] ? `Current Designation: ${candidate["Current Designation"]}` : "",
      candidate["What knowledge / skills of the candidate align with the position's requirements ?"] ? `Skill Alignment: ${candidate["What knowledge / skills of the candidate align with the position's requirements ?"]}` : "",
      candidate["Is the candidate overall stable?"] ? `Stability: ${candidate["Is the candidate overall stable?"]}` : "",
      candidate["Red flags ( if any )"] ? `Red Flags: ${candidate["Red flags ( if any )"]}` : "",
    ].filter(Boolean).join("\n");

    // Run AI evaluation
    const evaluation = await evaluateCandidate({
      transcript,
      question1: req_["AI Question 1"] ?? "",
      question2: req_["AI Question 2"] ?? "",
      question3: req_["AI Question 3"] ?? "",
      cultureGoals,
      hrDecision: candidate["Overall Candidate Fit Assessment"] ?? "",
      screeningNotes: candidate["Screening Remarks"] ?? "",
      positionTitle: candidate["Position Screened for"] ?? req_["Position Title"] ?? "",
      keySkills: req_["Key Skills Required"] ?? "",
      coreResponsibilities: req_["Core Responsibilities of the Position"] ?? req_["Core Responsibilities"] ?? "",
      experienceRequired: req_["Required Years of Experience"] ?? "",
      candidateData,
      hasRecording: !!recordingUrl,
    });

    // Write AI results back to sheet
    await updateRowByKey("Screening", "Screening ID", decodedId, {
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
    await updateRowByKey("Screening", "Screening ID", decodedId, {
      "AI Evaluation Status": "FAILED",
    });
    return NextResponse.json({ error: "AI evaluation failed" }, { status: 500 });
  }
}
