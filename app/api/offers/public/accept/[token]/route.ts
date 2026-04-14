import { NextRequest, NextResponse } from "next/server";
import { verifyOfferToken } from "@/lib/auth";
import { appendRowByFields, findRow, updateRowByKey, nowTimestamp } from "@/lib/sheets";
import { uploadFile } from "@/lib/drive";

const MAX_SIZE = 10 * 1024 * 1024;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await verifyOfferToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired offer link" }, { status: 401 });
  }

  const candidate = await findRow("Screening", "Screening ID", payload.screeningId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // Pull offer details from Issue Offer Form sheet
  const offer = await findRow("Issue Offer Form", "Screening ID (Auto)", payload.screeningId);

  return NextResponse.json({
    screeningId: payload.screeningId,
    candidateName: payload.candidateName,
    position: payload.position,
    email: candidate["Email Id"] ?? "",
    phone: candidate["Phone Number"] ?? "",
    offerLetterUrl: payload.offerLetterUrl,
    doj: offer?.["Date of Joining"] ?? "",
    hiringLocation: offer?.["Hiring Location"] ?? "",
    finalSalary: offer?.["Final Salary Amount (Per Annum)"] ?? "",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = await verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired offer link" }, { status: 401 });
    }

    const formData = await req.formData();
    const fullName = (formData.get("fullName") as string) ?? payload.candidateName;
    const contact = (formData.get("contact") as string) ?? "";
    const doj = (formData.get("doj") as string) ?? "";
    const email = (formData.get("email") as string) ?? "";
    const decision = (formData.get("decision") as string) ?? "";

    if (!["accept", "decline"].includes(decision)) {
      return NextResponse.json({ error: "Please choose accept or decline" }, { status: 400 });
    }

    const folder = ["HIRING", "OFFER_ACCEPTANCE", payload.screeningId];
    let resignationUrl = "";
    let signedOfferUrl = "";

    if (decision === "accept") {
      const signedOffer = formData.get("signedOffer") as File | null;
      if (!signedOffer || signedOffer.size === 0) {
        return NextResponse.json({ error: "Please upload the signed offer letter" }, { status: 400 });
      }
      if (signedOffer.size > MAX_SIZE) {
        return NextResponse.json({ error: "Signed offer exceeds 10MB" }, { status: 400 });
      }
      const buf = Buffer.from(await signedOffer.arrayBuffer());
      const res = await uploadFile(buf, signedOffer.name, signedOffer.type, folder);
      signedOfferUrl = res.webViewLink;

      const resignation = formData.get("resignation") as File | null;
      if (resignation && resignation.size > 0) {
        if (resignation.size > MAX_SIZE) {
          return NextResponse.json({ error: "Resignation file exceeds 10MB" }, { status: 400 });
        }
        const rbuf = Buffer.from(await resignation.arrayBuffer());
        const rres = await uploadFile(rbuf, resignation.name, resignation.type, folder);
        resignationUrl = rres.webViewLink;
      }
    }

    await appendRowByFields("Offer Acceptance Form - By Candidate", {
      "Timestamp": nowTimestamp(),
      "Full Name (Auto)": fullName,
      "Contact Number": contact,
      "Date of Joining": doj,
      "Do you accept the offer?": decision === "accept" ? "Yes" : "No",
      "Upload Proof of Resignation from Previous Employer (If Fresher - Not Applicable)": resignationUrl,
      "Upload Signed copy of offer letter": signedOfferUrl,
      "Email address": email,
      "Screening ID (Auto)": payload.screeningId,
    });

    await updateRowByKey("Screening", "Screening ID", payload.screeningId, {
      "Stage": decision === "accept" ? "OFFER_ACCEPTED" : "OFFER_DECLINED",
    });

    return NextResponse.json({ ok: true, decision });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[OfferAccept] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
