import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRdosSaveMeta, saveRdosSnapshot } from "@/lib/rdos/state-server";

/** RDOS 학습 상태 저장/조회 (사이드바 저장 버튼 연동) */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const meta = await getRdosSaveMeta(userId);
  return NextResponse.json(meta);
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const meta = await saveRdosSnapshot(userId);
  return NextResponse.json({ ok: true, ...meta });
}
