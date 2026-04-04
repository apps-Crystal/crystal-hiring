/**
 * auth.ts — Crystal Group AI-Powered Hiring System
 * JWT session auth with password hashing.
 */

import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
);
export const COOKIE_NAME = "hiring_session";
const TOKEN_EXPIRY = "8h";

// ─────────────────────────────────────────────────────────────────────────────
// Password
// ─────────────────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Session User
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  userId: string;
  email:  string;
  name:   string;
  role:   "CHRO" | "TA_HEAD" | "HR_SENIOR" | "HR_EXEC" | "MANAGEMENT";
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySession(token);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interview Token (for external interviewers — no login)
// ─────────────────────────────────────────────────────────────────────────────

export interface InterviewTokenPayload {
  screeningId: string;
  interviewerName: string;
  round: string;
  type: "interview_token";
}

export async function signInterviewToken(payload: InterviewTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyInterviewToken(
  token: string
): Promise<InterviewTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload as Record<string, unknown>).type !== "interview_token") return null;
    return payload as unknown as InterviewTokenPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role helpers
// ─────────────────────────────────────────────────────────────────────────────

export function canApproveRequisition(role: string): boolean {
  return ["CHRO", "TA_HEAD"].includes(role);
}

export function canApproveOffer(role: string): boolean {
  return ["CHRO", "MANAGEMENT"].includes(role);
}

export function canViewSalary(role: string): boolean {
  return ["CHRO", "TA_HEAD", "MANAGEMENT"].includes(role);
}
