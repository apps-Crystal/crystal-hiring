/**
 * sheet-schema.ts — Crystal Group AI-Powered Hiring System
 *
 * Column order MUST exactly match Row 1 headers in the live Google Sheet.
 * Existing sheet columns are preserved in their original order.
 * App-required columns that are not in the sheet are appended at the end.
 * Empty string "" entries represent blank header cells in the sheet.
 */

export type SheetName = keyof typeof SHEET_SCHEMA;

export const SHEET_SCHEMA = {

  // ── USERS ─────────────────────────────────────────────────────────────────
  USERS: [
    "USER_ID", "FULL_NAME", "EMAIL", "PHONE",
    "ROLE", "DEPARTMENT", "STATUS",
    "PASSWORD_HASH", "FAILED_LOGIN_COUNT",
    "RESET_TOKEN", "RESET_TOKEN_EXPIRY",
    "CREATED_DATE", "LAST_LOGIN",
  ],

  // ── CONFIG ────────────────────────────────────────────────────────────────
  CONFIG: [
    "KEY", "VALUE", "UPDATED_BY", "UPDATED_DATE",
  ],

  // ── REQUISITION FORM ──────────────────────────────────────────────────────
  // Existing sheet columns (do not reorder or insert between these)
  "Requisition Form": [
    "Timestamp",                                    // col 1
    "screening prefilled form link",                // col 2
    "Email address",                                // col 3
    "Position Title",                               // col 4
    "Requisition Id",                               // col 5
    "Total Nos Required",                           // col 6
    "Department",                                   // col 7
    "Location",                                     // col 8
    "Reporting Manager",                            // col 9
    "Required/Ideal Educational Qualification",      // col 10
    "Required Years of Experience",                 // col 11
    "Core Responsibilities of the Position",        // col 12
    "JD UPLOADING",                                 // col 13
    "Salary Range",                                 // col 14
    "Preferred Joining Date",                       // col 15
    "Key Skills Required",                          // col 16
    "Preferred Filters / Candidate Features",       // col 17
    "JD PDF Link",                                  // col 18
    "TAT",                                          // col 19
    "Screening ID",                                 // col 20
    "AI Question 3",                                // col 21
    "JD PDF URL",                                   // col 22
    "Raised By",                                    // col 23
    "Email address",                                // col 24
    "screening prefilled form link",                // col 25
    "Approved By",                                  // col 26
    "Approved Date",                                // col 27
    "Approval Remarks",                             // col 28
    "AI Question 1",                                // col 29
    "AI Question 2",                                // col 30
    // ── app-required columns appended at end ─────────
    "Job Type",                                     // col 31
    "Business Justification",                       // col 32
    "Requisition Status",                           // col 33
  ],

  // ── SCREENING ─────────────────────────────────────────────────────────────
  // Existing sheet columns (do not reorder or insert between these)
  Screening: [
    "Timestamp",
    "Date",
    "Email address",
    "Requisition Id",
    "Screening ID",
    "Shortened Prefilled Interview Form Link",
    "Candidate Name",
    "Phone Number",
    "Email Id",
    "Job location?",
    "Position Screened for",
    "Total Years of Experience",
    "Notice Period",
    "Current CTC (In Lakhs)",
    "Expected CTC (In Lakhs)",
    "Upload Resume:",
    "Screening Remarks",
    "What knowledge / skills of the candidate align with the position's requirements ?",
    "Is the candidate overall stable?",
    "Current Company Name, Designation, Working there since?",
    "Current Designation",
    "Willing to Relocate?",
    "Available for Interview Date",
    "Highest Qualification",
    "Key Skills",
    "Computer Proficiency",
    "Languages Known",
    "Expected DOJ",
    "Red flags ( if any )",
    "Timings Preference for Interview, if any",
    "Does the Candidate fit the basic Qualification and Job Requirements",
    "Overall Candidate Fit Assessment",
    "Interviewer Name",
    "Upload Call Recordings:",
    "Source",
    "Shortlisted_Candidates",
    "Position Name",
    "Req Date",
    "Location",
    "Remarks",
    "Column 1",
    "Column 2",
    "Column 3",
    "Column 4",
    "Column 5",
    "AI Risk Flags",
    "Call Transcript",
    "AI Evaluation Status",
    "Stage",
    // ── App-required columns appended at end ──
    "AI Technical Score",
    "AI Culture Score",
    "AI Validation Flag",
    "AI Validation Reason",
    "AI Strengths",
  ],

  // ── INTERVIEW FORM ────────────────────────────────────────────────────────
  // Existing sheet columns (do not reorder or insert between these)
  "Interview Form": [
    "Timestamp",
    "Button📩 Send Document Mail",
    "Interviewed By",
    "Screening ID (Auto)",
    "Candidate Name (Auto)",
    "Position Screened For (Auto)",
    "Interview for Round",
    "Interviewer Feedback",
    "Final Decision",
    "Upload Recording:",
    "Email address",
    "Candidate Mail ID (Auto)",
    "Candidate Resume",
    "Selection Completed",
    "Selected In Interview",
    "Column 1",
    "Current CTC",
    "Expected CTC",
    "Column 2",
    "Date (dd / mm /yy)",
    "Column 3",
    "Column 4",
    "Column 3",
    // ── App-required columns appended at end ──
    "Token",
    "Token Used",
  ],

  // ── DOCUMENTS COLLECTION ──────────────────────────────────────────────────
  // Existing sheet columns (do not reorder or insert between these)
  "Documents Collection": [
    "Timestamp",
    "Screening ID (For internal use only)",
    "Full Name",
    "Phone No.",
    "column 3",
    "Personal Email ID",
    "Position Screened For",
    "Location of Hiring",
    "ID proof",
    "Degree certificate(s)",
    "Appointment letter from your current/last employer",
    "Last three months' pay slips",
    "Latest CV",
    "I confirm that the documents uploaded are authentic and true to the best of my knowledge.",
    "Current CTC",
    "Column 16",
    "[FRD Response ID] DO NOT REMOVE",
    "Prefilled link to share offer approval request",
    "",          // blank column
    "",          // blank column
    "",          // blank column
    "",          // blank column
    "",          // blank column
    "Verification Complete",
    "Verified By",
    "Verified Date",
    // ── App-required columns appended at end ──
    "AI Verification Status",
    "AI ID Proof Verification",
    "AI Degree Verification",
    "AI Appointment Letter Verification",
    "AI Pay Slips Verification",
    "AI CV Verification",
    "AI Verification Flags",
  ],

  // ── MANAGEMENT OFFER APPROVAL FORM ────────────────────────────────────────
  // Existing sheet columns (do not reorder or insert between these)
  "Management Offer Approval Form": [
    "Candidate Name (Auto)",
    "Screening ID (Auto)",
    "Offered Designation",
    "Proposed CTC",
    "Approved CTC",
    "Date of Joining",
    "Reporting Manager",
    "Remarks",
    "Approval Decision",
    "Approver Name & Designation",
    "Date",
    "Place of Posting",
    "Designation to be Offered",
    ".",
    "Interview Feedback",
    "Current CTC",
    "Expected CTC",
    "Final Negotiated Amount",
    "Date of Joining",
    "Candidate ID proof URL",
    "Candidate Degree certificate(s) URL",
    "Candidate Latest CV URL",
    "Candidate Appointment letter from your current/last employer URL",
    "Candidate Last three months' pay slips URL",
    "On Requisition ID",
    "candiate mail id",
    "Send mail to candidate for offer acceptance",
    // ── App-required columns appended at end ──
    "Timestamp",
    "Approved By",
  ],

  // ── OFFER APPROVAL REQUEST ────────────────────────────────────────────────
  // NOTE: This sheet has an unknown number of blank columns between "Column 3"
  // and "Reporting Manager" — schema omitted so appendRowByFields falls back
  // to live headers (always correct). Only listed here for reference/reads.

} as const;

export function getSheetColumns(sheetName: string): readonly string[] | null {
  return (SHEET_SCHEMA as Record<string, readonly string[]>)[sheetName] ?? null;
}

export function getUnknownFields(
  sheetName: string,
  fields: Record<string, unknown>
): string[] {
  const cols = getSheetColumns(sheetName);
  if (!cols) return [];
  return Object.keys(fields).filter((k) => !cols.includes(k));
}
