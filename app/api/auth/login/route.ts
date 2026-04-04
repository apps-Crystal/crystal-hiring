import { NextRequest, NextResponse } from "next/server";
import { readSheet } from "@/lib/sheets";
import { verifyPassword, signSession, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const users = await readSheet("USERS");
  const user = users.find((u) => u.EMAIL?.toLowerCase() === email.toLowerCase());
  if (!user || user.STATUS !== "ACTIVE") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = verifyPassword(password, user.PASSWORD_HASH ?? "");
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession({
    userId: user.USER_ID,
    email: user.EMAIL,
    name: user.FULL_NAME,
    role: user.ROLE as "CHRO" | "TA_HEAD" | "HR_SENIOR" | "HR_EXEC" | "MANAGEMENT",
  });

  const res = NextResponse.json({
    user: { userId: user.USER_ID, email: user.EMAIL, name: user.FULL_NAME, role: user.ROLE },
  });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return res;
}
