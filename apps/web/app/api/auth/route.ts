import { NextRequest, NextResponse } from "next/server";

/**
 * Auth API Route
 *
 * Supabase Auth를 래핑합니다.
 * 클라이언트에서 직접 Supabase를 호출하지만,
 * 커스텀 로직이 필요할 때 이 라우트를 사용합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    switch (action) {
      case "update-profile":
        // TODO: Supabase profiles 테이블 업데이트
        return NextResponse.json({ ok: true, message: "프로필 업데이트됨" });

      case "update-settings":
        // TODO: 사용자 설정 업데이트 (gemini_model, language, etc.)
        return NextResponse.json({ ok: true, message: "설정 업데이트됨" });

      case "delete-account":
        // TODO: Supabase 사용자 삭제 + 관련 데이터 CASCADE
        return NextResponse.json({ ok: true, message: "계정 삭제 요청됨" });

      default:
        return NextResponse.json({ error: "알 수 없는 액션입니다." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Auth 처리 중 오류 발생" }, { status: 500 });
  }
}
