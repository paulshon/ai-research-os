import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "https://sarangred-ai-research-os-api.hf.space";

/**
 * AI Generate Proxy
 * 클라이언트 → Next.js API Route → FastAPI → Gemini
 *
 * 이 경로가 필요한 이유:
 * 1. 클라이언트에서 직접 FastAPI를 호출하면 CORS 이슈
 * 2. Next.js 서버에서 추가 인증/속도제한 처리 가능
 * 3. 서버 사이드에서 세션 검증 후 FastAPI로 전달
 */
export async function POST(req: NextRequest) {
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
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "AI 서비스 연결에 실패했습니다." },
      { status: 500 }
    );
  }
}
