import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/* ══════════════════════════════════════════════════════════════════════
   s-renew-17 · 연구 어시스턴트 — Gemini 직결

     음성/텍스트 입력
        └→ (음성은 브라우저 STT 로 텍스트화되어 들어온다)
             └→ Gemini 2.5 Flash 직접 호출
                  └→ 텍스트 답변

   [s-renew-17 변경]
   · 내부 지식 검색(RAG)과 FastAPI 프록시 경유를 **모두 제거**했다.
     모든 학술 질의응답은 AI-Research-OS 내부 엔진을 거치지 않고
     Gemini 가 직접 답한다.
   · 경유지가 사라져 지연·실패 지점도 함께 사라졌다.
   ══════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = process.env.ASSISTANT_MODEL || "gemini-2.5-flash";

/* 사용자별 레이트리밋 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
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

const LANG_NAME: Record<string, string> = { ko: "한국어", en: "English", zh: "中文" };

function systemInstruction(locale: string): string {
  const lang = LANG_NAME[locale] ?? "한국어";
  return [
    "당신은 학술연구 운영체제 Studium R 에 내장된 연구 어시스턴트입니다.",
    "연구설계·연구방법론·통계·문헌연구·논문작성·인용(APA 7판) 전반에 대해 답합니다.",
    "",
    "규칙:",
    "1) 학술적 정확성을 최우선으로 하고, 방법론·통계 용어는 정식 명칭을 씁니다.",
    "2) 절차를 묻는 질문은 번호를 매긴 단계로 답합니다.",
    "3) 확실하지 않은 사실은 단정하지 말고 한계를 함께 밝힙니다.",
    "4) 존재하지 않는 문헌·저자·DOI 를 만들어내지 않습니다.",
    "5) 음성으로 읽히는 경우가 있으므로 표·코드블록 대신 문장과 번호 목록을 씁니다.",
    `6) 답변 언어는 ${lang} 입니다.`,
    "7) 6~12문장 이내로 간결하게 답합니다.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (rateLimited(userId)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let question = "";
  let locale = "ko";
  let reqModel = "";
  try {
    const body = await req.json();
    question = String(body?.question ?? "").trim();
    locale = String(body?.locale ?? "ko");
    reqModel = String(body?.model ?? "");
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!question) return NextResponse.json({ error: "질문이 비어 있습니다." }, { status: 400 });

  /* 키: ① 설정에 저장한 사용자 키 → ② 서버 GEMINI_API_KEY */
  const key = req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";
  if (!key) {
    return NextResponse.json(
      { error: "Gemini API 키가 필요합니다. 설정 > API 키에서 등록해 주세요." },
      { status: 401 },
    );
  }

  const model = reqModel.startsWith("gemini") ? reqModel : DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ac.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction(locale) }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    }).finally(() => clearTimeout(timer));

    const data: unknown = await res.json().catch(() => ({}));
    const d = data as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: d?.error?.message || `Gemini HTTP ${res.status}` },
        { status: res.status },
      );
    }

    const text = (d?.candidates?.[0]?.content?.parts ?? []).map((p) => p?.text ?? "").join("");
    if (!text.trim()) {
      const reason = d?.candidates?.[0]?.finishReason || d?.promptFeedback?.blockReason || "empty";
      return NextResponse.json({ error: `Gemini 빈 응답 (${reason})` }, { status: 502 });
    }

    return NextResponse.json({ answer: text, model, via: "gemini" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network";
    return NextResponse.json({ error: `Gemini 호출 실패: ${msg}` }, { status: 502 });
  }
}
