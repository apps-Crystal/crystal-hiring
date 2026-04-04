import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRowByFields, nowTimestamp } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["CHRO", "TA_HEAD"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await readSheet("USERS");
  // Don't expose password hashes
  const safe = users.map(({ PASSWORD_HASH: _ph, RESET_TOKEN: _rt, ...rest }) => rest);
  return NextResponse.json({ users: safe });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "CHRO") {
    return NextResponse.json({ error: "CHRO only" }, { status: 403 });
  }

  const body = await req.json();
  const users = await readSheet("USERS");
  const exists = users.some((u) => u.EMAIL?.toLowerCase() === body.email?.toLowerCase());
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const seq = users.length + 1;
  const userId = `USR${String(seq).padStart(4, "0")}`;

  await appendRowByFields("USERS", {
    "USER_ID": userId,
    "FULL_NAME": body.name ?? "",
    "EMAIL": body.email ?? "",
    "PHONE": body.phone ?? "",
    "ROLE": body.role ?? "HR_EXEC",
    "DEPARTMENT": body.department ?? "",
    "STATUS": "ACTIVE",
    "PASSWORD_HASH": hashPassword(body.password ?? "crystal@2025"),
    "FAILED_LOGIN_COUNT": "0",
    "CREATED_DATE": nowTimestamp(),
  });

  return NextResponse.json({ userId }, { status: 201 });
}
