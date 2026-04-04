/**
 * ai.ts — Crystal Group AI-Powered Hiring System
 * Uses OpenRouter → Gemini for:
 *   1. JD-based technical question generation
 *   2. CV OCR / candidate detail extraction
 *   3. Speech-to-text transcription (via Gemini audio)
 *   4. Technical scoring (0–10) against 3 JD questions
 *   5. Culture fitment scoring (0–10)
 *   6. Validation flag (Agrees/Disagrees with HR decision)
 *   7. Document verification
 */

import OpenAI from "openai";

const MODEL_TEXT = "google/gemini-2.0-flash-001";
const MODEL_VISION = "google/gemini-2.0-flash-001"; // multimodal

function getClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Crystal Group Hiring System",
    },
  });
}

function json<T>(text: string): T {
  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(clean) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERATE 3 TECHNICAL QUESTIONS FROM JD
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedQuestions {
  question1: string;
  question2: string;
  question3: string;
}

export async function generateInterviewQuestions(params: {
  positionTitle: string;
  keyResponsibilities: string;
  keySkills: string;
  experience: string;
}): Promise<GeneratedQuestions> {
  const client = getClient();

  const prompt = `You are an expert HR technical interviewer at Crystal Group, a logistics and supply chain company.

Based on the following job description, generate exactly 3 concise technical screening questions that can be asked during a phone screening call. These questions should assess the candidate's core technical knowledge for the role.

Position: ${params.positionTitle}
Required Experience: ${params.experience}
Key Skills: ${params.keySkills}
Core Responsibilities: ${params.keyResponsibilities}

Requirements for questions:
- Each question should be answerable in 2-3 minutes verbally
- Focus on practical, role-specific knowledge
- Avoid yes/no questions
- Questions should be progressively more specific

Return ONLY valid JSON in this exact format:
{
  "question1": "...",
  "question2": "...",
  "question3": "..."
}`;

  const res = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return json<GeneratedQuestions>(res.choices[0].message.content ?? "{}");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CV OCR — EXTRACT CANDIDATE DETAILS
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedCVDetails {
  fullName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentRole: string;
  totalExperience: string;
  currentLocation: string;
  highestQualification: string;
  keySkills: string;
  currentCTC: string;
  expectedCTC: string;
  noticePeriod: string;
  languages: string;
}

export async function extractCVDetails(
  base64Content: string,
  mimeType: string
): Promise<ExtractedCVDetails> {
  const client = getClient();

  const prompt = `Extract structured information from this resume/CV. Return ONLY valid JSON with these exact fields (use empty string if not found):

{
  "fullName": "",
  "email": "",
  "phone": "",
  "currentCompany": "",
  "currentRole": "",
  "totalExperience": "",
  "currentLocation": "",
  "highestQualification": "",
  "keySkills": "",
  "currentCTC": "",
  "expectedCTC": "",
  "noticePeriod": "",
  "languages": ""
}`;

  const res = await client.chat.completions.create({
    model: MODEL_VISION,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Content}` },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  console.log(res.choices[0].message.content)

  return json<ExtractedCVDetails>(res.choices[0].message.content ?? "{}");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TRANSCRIBE CALL RECORDING
// ─────────────────────────────────────────────────────────────────────────────

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string
): Promise<string> {
  const client = getClient();

  const res = await client.chat.completions.create({
    model: MODEL_VISION,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Audio}` },
          },
          {
            type: "text",
            text: "Please transcribe this audio recording of a candidate screening call. Provide a complete, verbatim transcript with speaker labels (HR/Candidate). Format: 'HR: ...' and 'Candidate: ...'",
          },
        ],
      },
    ],
  });

  return res.choices[0].message.content ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EVALUATE CANDIDATE
// ─────────────────────────────────────────────────────────────────────────────

export interface AIEvaluationResult {
  technicalScore: number;      // 0–10
  cultureScore: number;        // 0–10
  validationFlag: "Agrees" | "Disagrees";
  validationReason: string;
  strengths: string;
  riskFlags: string;
  summary: string;
}

export async function evaluateCandidate(params: {
  transcript: string;
  question1: string;
  question2: string;
  question3: string;
  cultureGoals: string;
  hrDecision: string;
  screeningNotes: string;
  positionTitle: string;
}): Promise<AIEvaluationResult> {
  const client = getClient();

  const prompt = `You are an expert AI hiring evaluator for Crystal Group, a logistics and supply chain company.

Evaluate this candidate based on their screening call transcript.

Position: ${params.positionTitle}

TECHNICAL QUESTIONS ASKED:
1. ${params.question1}
2. ${params.question2}
3. ${params.question3}

COMPANY CULTURE GOALS:
${params.cultureGoals}

CALL TRANSCRIPT:
${params.transcript}

HR SCREENING NOTES:
${params.screeningNotes}

HR PRELIMINARY DECISION: ${params.hrDecision}

Evaluate and return ONLY valid JSON:
{
  "technicalScore": <0-10, based on quality of answers to the 3 technical questions>,
  "cultureScore": <0-10, based on culture fit assessment>,
  "validationFlag": <"Agrees" or "Disagrees" with HR decision>,
  "validationReason": <brief explanation of agreement/disagreement>,
  "strengths": <key strengths observed>,
  "riskFlags": <any red flags or concerns>,
  "summary": <2-3 sentence overall assessment>
}`;

  const res = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return json<AIEvaluationResult>(res.choices[0].message.content ?? "{}");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DOCUMENT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentVerificationResult {
  status: "VERIFIED" | "FLAGS_FOUND" | "INCOMPLETE";
  idProofCheck: string;
  degreeCheck: string;
  appointmentCheck: string;
  paySlipsCheck: string;
  cvCheck: string;
  flags: string;
  recommendation: string;
}

export async function verifyDocuments(params: {
  candidateName: string;
  screeningData: {
    currentCompany: string;
    currentRole: string;
    totalExperience: string;
    currentCTC: string;
  };
  documentUrls: {
    idProof?: string;
    degree?: string;
    appointmentLetter?: string;
    paySlips?: string;
    latestCV?: string;
  };
}): Promise<DocumentVerificationResult> {
  const client = getClient();

  const prompt = `You are a document verification specialist for Crystal Group HR team.

Candidate: ${params.candidateName}
Screening Data on File:
- Current Company: ${params.screeningData.currentCompany}
- Current Role: ${params.screeningData.currentRole}
- Total Experience: ${params.screeningData.totalExperience}
- Current CTC: ${params.screeningData.currentCTC}

Documents submitted (URLs provided for reference):
- ID Proof: ${params.documentUrls.idProof ?? "Not submitted"}
- Degree Certificate: ${params.documentUrls.degree ?? "Not submitted"}
- Appointment Letter: ${params.documentUrls.appointmentLetter ?? "Not submitted"}
- Pay Slips (3 months): ${params.documentUrls.paySlips ?? "Not submitted"}
- Latest CV: ${params.documentUrls.latestCV ?? "Not submitted"}

Based on document completeness, return ONLY valid JSON:
{
  "status": "VERIFIED" | "FLAGS_FOUND" | "INCOMPLETE",
  "idProofCheck": "OK/Issue description",
  "degreeCheck": "OK/Issue description",
  "appointmentCheck": "OK/Issue description",
  "paySlipsCheck": "OK/Issue description",
  "cvCheck": "OK/Issue description",
  "flags": "List any discrepancies or missing items",
  "recommendation": "Brief recommendation"
}`;

  const res = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return json<DocumentVerificationResult>(res.choices[0].message.content ?? "{}");
}
