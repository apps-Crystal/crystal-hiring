import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractCVDetails } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const details = await extractCVDetails(base64, file.type);
    return NextResponse.json({ details });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ExtractCV] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
