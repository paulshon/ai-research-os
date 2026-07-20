/**
 * bridge.ts — 연구방법 엔진 ↔ 논문 작성 연동.
 *
 * 연구방법 작업공간(예: 혼합 질적내용분석)에서 생성한 절(연구방법/결과/논의/결론)을
 * 브라우저에 저장하고, 논문 작성 화면에서 불러와 본문에 삽입할 수 있게 한다.
 * 스토리지는 프로젝트 저장/초기화와 동일한 이벤트 모델을 따른다.
 */

const STORAGE_KEY = "aros:method:outputs";
export const METHOD_OUTPUTS_EVENT = "aros:method-outputs-changed";

export interface MethodOutputSection {
  key: string; // methodology | results | discussion | conclusion | ...
  title: string; // 연구방법 / 결과 / ...
  body: string;
}

export interface MethodOutput {
  methodId: string; // 예: "qca"
  methodName: string; // 예: "혼합 질적내용분석"
  projectName: string;
  savedAt: string; // ISO
  sections: MethodOutputSection[];
}

export function saveMethodOutput(output: MethodOutput): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(output));
    window.dispatchEvent(new CustomEvent(METHOD_OUTPUTS_EVENT));
  } catch {
    /* localStorage unavailable */
  }
}

export function loadMethodOutput(): MethodOutput | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MethodOutput;
  } catch {
    return null;
  }
}

export function clearMethodOutput(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(METHOD_OUTPUTS_EVENT));
  } catch {
    /* ignore */
  }
}
