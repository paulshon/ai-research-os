import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL || "https://sarangred-ai-research-os-api.hf.space";

/**
 * AI Generate Proxy (v4)
 * 클라이언트 → Next.js API Route → FastAPI → Gemini
 *
 * 감사보고서 2.5 해결: 인증 없는 오픈 릴레이 → 다음을 추가.
 *  1) Clerk 세션 검증(auth()): 로그인 사용자만 사용 가능.
 *  2) 사용자별 레이트리밋(슬라이딩 윈도우, 인메모리).
 *     (멀티 인스턴스 운영 시 Redis 등 분산 저장소로 교체 권장.)
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30; // 분당 30회/사용자
const hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(userId, arr);
    return true;
  }
  arr.push(now);
  hits.set(userId, arr);
  return false;
}

export async function POST(req: NextRequest) {
  // 1) 인증: 로그인 사용자만
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  // 2) 레이트리밋
  if (rateLimited(userId)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const geminiKey = req.headers.get("x-gemini-key");
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Gemini API 키가 필요합니다. 설정에서 API 키를 입력해주세요." },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_URL}/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gemini-Key": geminiKey,
        "X-User-Id": userId,
        ...(process.env.INTERNAL_API_KEY ? { "X-Internal-Key": process.env.INTERNAL_API_KEY } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "AI 서비스 연결에 실패했습니다." }, { status: 500 });
  }
}
