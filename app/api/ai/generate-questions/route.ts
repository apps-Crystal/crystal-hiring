import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateInterviewQuestions } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const questions = await generateInterviewQuestions({
    positionTitle: body.positionTitle ?? "",
    keyResponsibilities: body.coreResponsibilities ?? "",
    keySkills: body.keySkills ?? "",
    experience: body.experience ?? "",
  });

  return NextResponse.json({ questions });
}
