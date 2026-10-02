import { NextResponse } from "next/server";
import { statusLlb } from "@/lib/literature/llb-status";

export const dynamic = "force-dynamic";

/** GET /api/scholar/llb-status — ClickHouse 연결 여부와 lit_papers 적재 진행률 */
export async function GET() {
  const s = await statusLlb();
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
}
