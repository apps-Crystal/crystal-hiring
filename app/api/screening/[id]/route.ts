import { NextRequest, NextResponse } from "next/server";
import { findRow, updateRowByKey } from "@/lib/sheets";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await findRow("Screening", "Screening ID", id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Hide salary from HR Senior
  if (session.role === "HR_SENIOR") {
    delete row["Current CTC (In Lakhs)"];
    delete row["Expected CTC (In Lakhs)"];
  }

  return NextResponse.json({ candidate: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const updates = await req.json();

  await updateRowByKey("Screening", "Screening ID", id, updates);
  return NextResponse.json({ ok: true });
}
