import { NextRequest, NextResponse } from "next/server";
import { readSheet, findRow } from "@/lib/sheets";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const req_ = await findRow("Requisition Form", "Requisition Id", id);
  if (!req_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ requisition: req_ });
}
