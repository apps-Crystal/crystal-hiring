/**
 * email.ts — Crystal Group AI-Powered Hiring System
 * Nodemailer-based email notifications.
 * Recipients are managed via CONFIG sheet (key: EMAIL_LIST_*)
 */

import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
}

const FROM = `Crystal Group HR <${process.env.SMTP_USER ?? "apps@crystalgroup.in"}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; padding: 32px; max-width: 600px; margin: 0 auto; }
  .header { background: #0f172a; color: #fff; padding: 20px 32px; border-radius: 8px 8px 0 0; margin: -32px -32px 24px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  td:first-child { color: #64748b; width: 40%; }
  .btn { display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 16px; }
  .footer { color: #94a3b8; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Crystal Group HR</h1>
    <p>${title}</p>
  </div>
  ${body}
  <div class="footer">This is an automated message from Crystal Group AI-Powered Hiring System.</div>
</div>
</body>
</html>`;
}

async function send(to: string | string[], subject: string, html: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. REQUISITION SUBMITTED → CHRO / TA Head
// ─────────────────────────────────────────────────────────────────────────────

export async function sendRequisitionNotification(params: {
  to: string[];
  reqId: string;
  position: string;
  department: string;
  raisedBy: string;
  location: string;
  openings: string;
}) {
  const body = `
<p>A new job requisition has been submitted and requires your approval.</p>
<table>
  <tr><td>Requisition ID</td><td><strong>${params.reqId}</strong></td></tr>
  <tr><td>Position</td><td>${params.position}</td></tr>
  <tr><td>Department</td><td>${params.department}</td></tr>
  <tr><td>Location</td><td>${params.location}</td></tr>
  <tr><td>No. of Openings</td><td>${params.openings}</td></tr>
  <tr><td>Raised By</td><td>${params.raisedBy}</td></tr>
</table>
<a href="${APP_URL}/dashboard/requisitions" class="btn">Review Requisition</a>`;

  await send(
    params.to,
    `[Action Required] New Requisition: ${params.position} — ${params.reqId}`,
    baseTemplate("New Job Requisition Submitted", body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REQUISITION APPROVED/REJECTED
// ─────────────────────────────────────────────────────────────────────────────

export async function sendRequisitionDecision(params: {
  to: string[];
  reqId: string;
  position: string;
  decision: "APPROVED" | "REJECTED";
  approvedBy: string;
  remarks: string;
}) {
  const badge = params.decision === "APPROVED"
    ? `<span class="badge badge-green">APPROVED</span>`
    : `<span class="badge badge-red">REJECTED</span>`;

  const body = `
<p>The following requisition has been <strong>${params.decision}</strong>.</p>
<table>
  <tr><td>Requisition ID</td><td><strong>${params.reqId}</strong></td></tr>
  <tr><td>Position</td><td>${params.position}</td></tr>
  <tr><td>Decision</td><td>${badge}</td></tr>
  <tr><td>Decided By</td><td>${params.approvedBy}</td></tr>
  <tr><td>Remarks</td><td>${params.remarks || "—"}</td></tr>
</table>
<a href="${APP_URL}/dashboard/requisitions" class="btn">View Requisitions</a>`;

  await send(
    params.to,
    `Requisition ${params.decision}: ${params.position} — ${params.reqId}`,
    baseTemplate(`Requisition ${params.decision}`, body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CANDIDATE SCREENED → HR Senior / TA Head
// ─────────────────────────────────────────────────────────────────────────────

export async function sendScreeningComplete(params: {
  to: string[];
  screeningId: string;
  candidateName: string;
  position: string;
  hrDecision: string;
  aiTechScore: string;
  aiCultureScore: string;
  aiFlag: string;
}) {
  const body = `
<p>A candidate has been screened and AI evaluation is complete.</p>
<table>
  <tr><td>Screening ID</td><td><strong>${params.screeningId}</strong></td></tr>
  <tr><td>Candidate</td><td>${params.candidateName}</td></tr>
  <tr><td>Position</td><td>${params.position}</td></tr>
  <tr><td>HR Decision</td><td>${params.hrDecision}</td></tr>
  <tr><td>AI Technical Score</td><td>${params.aiTechScore}/10</td></tr>
  <tr><td>AI Culture Score</td><td>${params.aiCultureScore}/10</td></tr>
  <tr><td>AI Validation</td><td>${params.aiFlag}</td></tr>
</table>
<a href="${APP_URL}/dashboard/candidates/${params.screeningId}" class="btn">View Candidate Profile</a>`;

  await send(
    params.to,
    `Screening Complete: ${params.candidateName} — ${params.position}`,
    baseTemplate("Candidate Screening Completed", body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTERVIEW TOKEN — External Interviewer
// ─────────────────────────────────────────────────────────────────────────────

export async function sendInterviewToken(params: {
  to: string;
  interviewerName: string;
  candidateName: string;
  position: string;
  round: string;
  token: string;
}) {
  const link = `${APP_URL}/interview/${params.token}`;
  const body = `
<p>Dear ${params.interviewerName},</p>
<p>You have been assigned to conduct an interview. Please use the secure link below to submit your feedback.</p>
<table>
  <tr><td>Candidate</td><td><strong>${params.candidateName}</strong></td></tr>
  <tr><td>Position</td><td>${params.position}</td></tr>
  <tr><td>Round</td><td>${params.round}</td></tr>
</table>
<p>Click the button below to access the interview form. No login required.</p>
<a href="${link}" class="btn">Open Interview Form</a>
<p style="color:#94a3b8;font-size:12px;margin-top:12px;">This link is valid for 7 days and is unique to you.</p>`;

  await send(
    params.to,
    `Interview Assignment: ${params.candidateName} — ${params.round}`,
    baseTemplate("Interview Assignment", body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DOCUMENT COLLECTION REQUEST → Candidate
// ─────────────────────────────────────────────────────────────────────────────

export async function sendDocumentRequest(params: {
  to: string;
  candidateName: string;
  position: string;
  uploadLink: string;
}) {
  const body = `
<p>Dear ${params.candidateName},</p>
<p>Congratulations! You have been shortlisted for the position of <strong>${params.position}</strong> at Crystal Group.</p>
<p>As part of our onboarding process, we require you to submit the following documents:</p>
<ul style="font-size:14px;line-height:1.8;">
  <li>Government-issued ID proof (Aadhar/PAN/Passport)</li>
  <li>Degree certificate(s)</li>
  <li>Appointment letter from current/last employer</li>
  <li>Last 3 months' pay slips</li>
  <li>Latest CV/Resume</li>
</ul>
<p>Please upload all documents using the secure link below:</p>
<a href="${params.uploadLink}" class="btn">Upload Documents</a>
<p style="color:#94a3b8;font-size:12px;margin-top:12px;">File formats accepted: PDF, JPG, PNG (max 10MB each)</p>`;

  await send(
    params.to,
    `Action Required: Document Submission — ${params.position} at Crystal Group`,
    baseTemplate("Document Submission Request", body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OFFER APPROVAL REQUEST → Management / CHRO
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOfferApprovalRequest(params: {
  to: string[];
  candidateName: string;
  screeningId: string;
  position: string;
  finalCTC: string;
  doj: string;
  approvalLink: string;
}) {
  const body = `
<p>A new offer approval request has been submitted for your review.</p>
<table>
  <tr><td>Candidate</td><td><strong>${params.candidateName}</strong></td></tr>
  <tr><td>Screening ID</td><td>${params.screeningId}</td></tr>
  <tr><td>Position</td><td>${params.position}</td></tr>
  <tr><td>Final CTC</td><td>${params.finalCTC} Lakhs</td></tr>
  <tr><td>Date of Joining</td><td>${params.doj}</td></tr>
</table>
<p>Please review and approve/reject the offer:</p>
<a href="${params.approvalLink}" class="btn">Review Offer</a>`;

  await send(
    params.to,
    `[Approval Required] Offer: ${params.candidateName} — ${params.position}`,
    baseTemplate("Offer Approval Required", body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. OFFER LETTER → Candidate
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOfferToCandidate(params: {
  to: string;
  candidateName: string;
  position: string;
  signLink: string;
  doj: string;
}) {
  const body = `
<p>Dear ${params.candidateName},</p>
<p>We are delighted to extend you an offer to join Crystal Group as <strong>${params.position}</strong>.</p>
<p>Please review your offer letter and complete the signing process using the link below.</p>
<table>
  <tr><td>Position</td><td><strong>${params.position}</strong></td></tr>
  <tr><td>Date of Joining</td><td>${params.doj}</td></tr>
</table>
<a href="${params.signLink}" class="btn">View & Sign Offer Letter</a>
<p style="color:#94a3b8;font-size:12px;margin-top:12px;">Please accept within 7 days of receipt.</p>`;

  await send(
    params.to,
    `Offer Letter — ${params.position} at Crystal Group`,
    baseTemplate("Your Offer Letter", body)
  );
}
