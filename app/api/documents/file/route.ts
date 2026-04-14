import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findDriveFileByName } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const value = req.nextUrl.searchParams.get("value");
  if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });

  // If already a URL, just redirect
  if (/^https?:\/\//i.test(value)) {
    return NextResponse.redirect(value);
  }

  // Otherwise treat as filename and search Drive
  try {
    const found = await findDriveFileByName(value);
    if (!found) {
      return NextResponse.json(
        { error: `File "${value}" not found in Drive. It may have been deleted or never uploaded.` },
        { status: 404 }
      );
    }
    return NextResponse.redirect(found.webViewLink);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DocsFileProxy] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
