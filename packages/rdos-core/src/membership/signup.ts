import type { TrackId } from "./tracks";

export interface Field { key: string; label: string; required: boolean; type: "text"|"email"|"url"|"select"|"boolean"; }

/** 트랙별 회원가입 폼 스키마 */
export const SIGNUP_FIELDS: Record<TrackId, Field[]> = {
  rdos: [
    { key:"name",        label:"이름",          required:true,  type:"text" },
    { key:"email",       label:"이메일",        required:true,  type:"email" },
    { key:"university",  label:"소속 대학",     required:true,  type:"text" },
    { key:"department",  label:"학과",          required:true,  type:"text" },
    { key:"isMasters",   label:"석사과정 여부", required:true,  type:"boolean" },
    { key:"advisor",     label:"지도교수명",    required:false, type:"text" },
    { key:"interest",    label:"연구 관심 분야",required:true,  type:"text" },
  ],
  aros: [
    { key:"name",         label:"이름",                    required:true,  type:"text" },
    { key:"email",        label:"이메일",                  required:true,  type:"email" },
    { key:"institution",  label:"소속기관",                required:true,  type:"text" },
    { key:"field",        label:"연구분야",                required:true,  type:"text" },
    { key:"orcid",        label:"ORCID",                   required:false, type:"text" },
    { key:"scholar",      label:"Google Scholar 링크",     required:false, type:"url" },
    { key:"paper1",       label:"대표 논문 링크 1",        required:true,  type:"url" },
    { key:"paper2",       label:"대표 논문 링크 2",        required:true,  type:"url" },
    { key:"thesis",       label:"석사논문/학술논문 링크",  required:true,  type:"url" },
  ],
};

export interface ValidationResult { ok: boolean; errors: string[]; }

/** 가입 조건 검증 (RDOS: 석사과정 / AROS: 논문 2편+ 링크 검증) */
export function validateSignup(track: TrackId, data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  for (const f of SIGNUP_FIELDS[track]) {
    if (f.required && (data[f.key] === undefined || data[f.key] === "" || data[f.key] === null))
      errors.push(`${f.label} 필수`);
  }
  if (track === "rdos") {
    if (data.isMasters !== true) errors.push("가입 조건: 석사과정 재학 또는 입학 예정이어야 합니다");
  }
  if (track === "aros") {
    const links = [data.paper1, data.paper2, data.thesis].filter(Boolean) as string[];
    if (links.length < 2) errors.push("가입 조건: 최소 2편 이상의 학술/석사 논문 링크 필요");
    if (!links.every(isVerifiableUrl)) errors.push("논문 링크 검증 실패(유효 URL 아님)");
  }
  return { ok: errors.length === 0, errors };
}

function isVerifiableUrl(u: string) {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; }
  catch { return false; }
}
