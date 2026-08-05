import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL || "https://sarangred-ai-research-os-api.hf.space";

/**
 * Projects Proxy (v4)
 * 감사보고서 2.2 해결: 인증 게이트 추가(IDOR 방지).
 *  - Clerk 세션 검증 후, 검증된 userId 를 신뢰 경계(X-User-Id + X-Internal-Key)로
 *    FastAPI 에 전달한다. FastAPI 는 이 userId 로 owner_id 스코프를 강제한다.
 */
function authHeaders(userId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    ...(process.env.INTERNAL_API_KEY ? { "X-Internal-Key": process.env.INTERNAL_API_KEY } : {}),
  };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspace_id") || "";
  try {
    const url = workspaceId
      ? `${API_URL}/projects?workspace_id=${encodeURIComponent(workspaceId)}`
      : `${API_URL}/projects`;
    const response = await fetch(url, { headers: authHeaders(userId) });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Projects API 연결 실패" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const response = await fetch(`${API_URL}/projects`, {
      method: "POST",
      headers: authHeaders(userId),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Projects API 연결 실패" }, { status: 500 });
  }
}
