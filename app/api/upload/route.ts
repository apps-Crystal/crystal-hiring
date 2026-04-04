import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// NOTE: Google Drive upload is disabled — service accounts cannot write to
// regular "My Drive" folders (no storage quota). Files are processed in-memory
// for AI extraction only. Switch ROOT_FOLDER_ID to a Shared Drive to re-enable.

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Return a placeholder — Drive upload skipped until a Shared Drive is configured.
    return NextResponse.json({ url: "", fileId: "" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Upload] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
