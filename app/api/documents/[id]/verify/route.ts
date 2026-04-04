import { NextRequest, NextResponse } from "next/server";
import { findRow, updateRowByKey, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { verifyDocuments } from "@/lib/ai";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // screeningId

  const doc = await findRow("Documents Collection", "Screening ID (For internal use only)", id);
  if (!doc) return NextResponse.json({ error: "Documents not found" }, { status: 404 });

  const candidate = await findRow("Screening", "Screening ID", id);

  const result = await verifyDocuments({
    candidateName: doc["Full Name"] ?? "",
    screeningData: {
      currentCompany: candidate?.["Current Company Name, Designation, Working there since?"] ?? "",
      currentRole: candidate?.["Current Designation"] ?? "",
      totalExperience: candidate?.["Total Years of Experience"] ?? "",
      currentCTC: candidate?.["Current CTC (In Lakhs)"] ?? "",
    },
    documentUrls: {
      idProof: doc["ID proof"],
      degree: doc["Degree certificate(s)"],
      appointmentLetter: doc["Appointment letter from your current/last employer"],
      paySlips: doc["Last three months' pay slips"],
      latestCV: doc["Latest CV"],
    },
  });

  await updateRowByKey("Documents Collection", "Screening ID (For internal use only)", id, {
    "AI Verification Status": result.status,
    "AI ID Proof Verification": result.idProofCheck,
    "AI Degree Verification": result.degreeCheck,
    "AI Appointment Letter Verification": result.appointmentCheck,
    "AI Pay Slips Verification": result.paySlipsCheck,
    "AI CV Verification": result.cvCheck,
    "AI Verification Flags": result.flags,
  });

  return NextResponse.json({ result });
}
