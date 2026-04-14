import { NextRequest, NextResponse } from "next/server";
import { getSession, signOfferToken } from "@/lib/auth";
import { appendRowByFields, findRow, updateRowByKey, nowTimestamp } from "@/lib/sheets";
import { uploadFile } from "@/lib/drive";
import { sendOfferIssued } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const screeningId = (formData.get("screeningId") as string) ?? "";
    const designation = (formData.get("designation") as string) ?? "";
    const hiringLocation = (formData.get("hiringLocation") as string) ?? "";
    const finalSalary = (formData.get("finalSalary") as string) ?? "";
    const doj = (formData.get("doj") as string) ?? "";
    const offerLetter = formData.get("offerLetter") as File | null;

    if (!screeningId || !offerLetter || offerLetter.size === 0) {
      return NextResponse.json({ error: "Screening ID and offer letter PDF are required" }, { status: 400 });
    }

    const candidate = await findRow("Screening", "Screening ID", screeningId);
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    // Upload offer letter to Drive
    const buffer = Buffer.from(await offerLetter.arrayBuffer());
    const { webViewLink: offerLetterUrl } = await uploadFile(
      buffer,
      offerLetter.name,
      offerLetter.type,
      ["HIRING", "OFFER_LETTERS", screeningId]
    );

    // Generate offer acceptance token
    const token = await signOfferToken({
      screeningId,
      candidateName: candidate["Candidate Name"] ?? "",
      position: designation || (candidate["Position Screened for"] ?? ""),
      offerLetterUrl,
      type: "offer_token",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const acceptLink = `${appUrl}/offer/accept/${token}`;

    // Append to Issue Offer Form sheet
    await appendRowByFields("Issue Offer Form", {
      "Timestamp": nowTimestamp(),
      "Candidate Name (Auto)": candidate["Candidate Name"] ?? "",
      "Screening ID (Auto)": screeningId,
      "Designation to be Offered": designation,
      "Hiring Location": hiringLocation,
      "Final Salary Amount (Per Annum)": finalSalary,
      "Date of Joining": doj,
      "Upload Offer Letter": offerLetterUrl,
      "Candidate Mail id (auto)": candidate["Email Id"] ?? "",
      "mail_sent_status": "PENDING",
    });

    // Email the candidate
    let mailStatus = "SENT";
    try {
      await sendOfferIssued({
        to: candidate["Email Id"] ?? "",
        candidateName: candidate["Candidate Name"] ?? "",
        position: designation || (candidate["Position Screened for"] ?? ""),
        doj,
        finalCTC: finalSalary,
        hiringLocation,
        offerLetterUrl,
        acceptLink,
      });
    } catch (e) {
      console.error("[IssueOffer] Email failed:", e);
      mailStatus = "FAILED";
    }

    // Update mail_sent_status in the row we just wrote
    await updateRowByKey("Issue Offer Form", "Screening ID (Auto)", screeningId, {
      "mail_sent_status": mailStatus,
    });

    // Advance candidate stage
    await updateRowByKey("Screening", "Screening ID", screeningId, {
      "Stage": "OFFER_ISSUED",
    });

    // Mark the offer request as issued so the Offers page can filter it out
    // of the "Ready to Issue" tab.
    await updateRowByKey("Offer Approval Request", "Screening ID (Auto)", screeningId, {
      "Offer Letter Issued": "Yes",
      "Offer Letter URL": offerLetterUrl,
    });

    return NextResponse.json({ ok: true, offerLetterUrl, acceptLink, mailStatus });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[IssueOffer] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
