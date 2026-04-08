import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/drive";

const FOLDER_MAP: Record<string, string[]> = {
  RESUMES: ["HIRING", "RESUMES"],
  RECORDINGS: ["HIRING", "RECORDINGS"],
  DOCUMENTS: ["HIRING", "DOCUMENTS"],
  JD: ["HIRING", "JD"],
  INTERVIEW_RECORDINGS: ["HIRING", "INTERVIEW_RECORDINGS"],
  BGV: ["HIRING", "BGV"],
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) ?? "RESUMES";
    const subFolder = formData.get("subFolder") as string | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const basePath = FOLDER_MAP[folder] ?? ["HIRING", folder];
    const folderPath = subFolder ? [...basePath, subFolder] : basePath;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileId, webViewLink } = await uploadFile(buffer, file.name, file.type, folderPath);

    return NextResponse.json({ url: webViewLink, fileId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Upload] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
