import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConfig, setConfig, getEmailList, getCultureGoals, getDocChecklist } from "@/lib/config";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    requisitionApprovers,
    screeningNotify,
    offerApprovers,
    hrExecList,
    cultureGoals,
    docChecklist,
  ] = await Promise.all([
    getEmailList("REQUISITION_APPROVERS"),
    getEmailList("SCREENING_NOTIFY"),
    getEmailList("OFFER_APPROVERS"),
    getEmailList("HR_EXEC_LIST"),
    getCultureGoals(),
    getDocChecklist(),
  ]);

  return NextResponse.json({
    requisitionApprovers,
    screeningNotify,
    offerApprovers,
    hrExecList,
    cultureGoals,
    docChecklist,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["CHRO", "TA_HEAD"].includes(session.role)) {
    return NextResponse.json({ error: "CHRO/TA Head only" }, { status: 403 });
  }

  const body = await req.json();

  const updates: [string, string][] = [];
  if (body.requisitionApprovers !== undefined)
    updates.push(["REQUISITION_APPROVERS", Array.isArray(body.requisitionApprovers) ? body.requisitionApprovers.join(",") : body.requisitionApprovers]);
  if (body.screeningNotify !== undefined)
    updates.push(["SCREENING_NOTIFY", Array.isArray(body.screeningNotify) ? body.screeningNotify.join(",") : body.screeningNotify]);
  if (body.offerApprovers !== undefined)
    updates.push(["OFFER_APPROVERS", Array.isArray(body.offerApprovers) ? body.offerApprovers.join(",") : body.offerApprovers]);
  if (body.hrExecList !== undefined)
    updates.push(["HR_EXEC_LIST", Array.isArray(body.hrExecList) ? body.hrExecList.join(",") : body.hrExecList]);
  if (body.cultureGoals !== undefined)
    updates.push(["CULTURE_GOALS", body.cultureGoals]);
  if (body.docChecklist !== undefined)
    updates.push(["DOC_CHECKLIST", JSON.stringify(body.docChecklist)]);

  await Promise.all(updates.map(([k, v]) => setConfig(k, v, session.name)));

  return NextResponse.json({ ok: true });
}
