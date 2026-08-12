import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 서버 음성 전사 (Speech-to-Text)

   브라우저 SpeechRecognition 이 없거나(Electron 데스크탑·Firefox·Safari·
   삼성인터넷·인앱 브라우저) network 오류로 죽는 환경에서, 클라이언트가
   16 kHz 모노 WAV 를 보내면 Gemini 가 받아쓴다.

   키는 어시스턴트와 완전히 같은 경로를 쓴다.
     ① 설정 > API 키에 저장한 사용자 키 (X-Gemini-Key 헤더)
     ② 서버 환경변수 GEMINI_API_KEY
   ══════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_MODEL = process.env.STT_MODEL || process.env.ASSISTANT_MODEL || "gemini-2.5-flash";

/** base64 기준 최대 12MB — 16 kHz 모노 WAV 로 약 4분 분량 */
const MAX_B64 = 12 * 1024 * 1024;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
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

const LANG_NAME: Record<string, string> = {
  "ko-KR": "한국어",
  "en-US": "English",
  "zh-CN": "中文(简体)",
};

const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/flac",
]);

/* Clerk 을 붙이지 않고 띄운 환경(사내 배포·데스크탑 오프라인 빌드)에서는
   인증을 요구하지 않는다. 붙어 있으면 기존대로 로그인 사용자만 허용한다. */
const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !!process.env.CLERK_SECRET_KEY;

export async function POST(req: NextRequest) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (CLERK_ENABLED && !userId) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "auth" }, { status: 401 });
  }
  const rlKey = userId ?? req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(rlKey)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let audio = "";
  let mimeType = "audio/wav";
  let lang = "ko-KR";
  try {
    const body = await req.json();
    audio = String(body?.audio ?? "");
    mimeType = String(body?.mimeType ?? "audio/wav");
    lang = String(body?.lang ?? "ko-KR");
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!audio) return NextResponse.json({ error: "오디오가 비어 있습니다." }, { status: 400 });
  if (audio.length > MAX_B64) {
    return NextResponse.json({ error: "녹음이 너무 깁니다. 짧게 나눠 말씀해 주세요." }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(mimeType)) mimeType = "audio/wav";

  const key = req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";
  if (!key) {
    return NextResponse.json(
      {
        error: "음성 전사에는 Gemini API 키가 필요합니다. 설정 > API 키에서 등록해 주세요.",
        code: "no-key",
      },
      { status: 401 },
    );
  }

  const langName = LANG_NAME[lang] ?? "한국어";
  const prompt = [
    `다음 오디오를 ${langName}로 받아쓰기하세요.`,
    "규칙:",
    "1) 들린 말만 그대로 옮깁니다. 설명·요약·번역·따옴표를 덧붙이지 않습니다.",
    "2) 학술 용어(연구설계, 문헌연구, 표본, 타당도 등)는 정확한 표기를 씁니다.",
    "3) 말이 없거나 잡음뿐이면 빈 문자열만 출력합니다.",
    "4) 출력은 받아쓴 문장 한 덩어리뿐입니다.",
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    DEFAULT_MODEL,
  )}:generateContent`;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ac.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: audio } }],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 1024 },
      }),
    }).finally(() => clearTimeout(timer));

    const data: unknown = await res.json().catch(() => ({}));
    const d = data as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: d?.error?.message || `Gemini HTTP ${res.status}` },
        { status: res.status },
      );
    }
    const text = (d?.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p?.text ?? "")
      .join("")
      .trim();
    return NextResponse.json({ text, via: "gemini", model: DEFAULT_MODEL });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network";
    return NextResponse.json({ error: `전사 실패: ${msg}` }, { status: 502 });
  }
}
