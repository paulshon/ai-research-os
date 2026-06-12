"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";

/* ════════════════════════════════════════════════════════════
   연구자(Researcher) 플랜 회원가입 — 인증 프로세스 7단계 (사양서 4절)
   1 플랜선택 → 2 정보입력 → 3 논문/학위정보 → 4 이메일인증
   → 5 로그인(Google/GitHub/Email) → 6 관리자승인 → 7 서비스진입(AI-Research-OS)
   가입 조건: 최소 2편 이상 학술/석사 논문 링크 제출 + 링크 검증 통과.
═══════════════════════════════════════════════════════════════ */

const STEPS = [
  { n: 1, label: "플랜 선택" },
  { n: 2, label: "가입 정보 입력" },
  { n: 3, label: "논문 링크 / 학위 정보" },
  { n: 4, label: "이메일 인증" },
  { n: 5, label: "로그인" },
  { n: 6, label: "관리자 승인" },
  { n: 7, label: "서비스 진입" },
];
const ACCENT = "#6c8cff";
const isUrl = (s: string) => /^https?:\/\/.+/i.test(s.trim());

type Form = {
  name: string; email: string; institution: string; field: string;
  orcid: string; scholar: string; paper1: string; paper2: string; thesis: string;
};

export default function ResearcherSignupWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>({
    name: "", email: "", institution: "", field: "",
    orcid: "", scholar: "", paper1: "", paper2: "", thesis: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const go = (n: number) => { setErrors([]); setStep(n); };

  function validateInfo() {
    const e: string[] = [];
    if (!form.name) e.push("이름은 필수입니다");
    if (!form.email) e.push("이메일은 필수입니다");
    if (!form.institution) e.push("소속기관은 필수입니다");
    if (!form.field) e.push("연구분야는 필수입니다");
    setErrors(e);
    return e.length === 0;
  }
  function validatePapers() {
    const e: string[] = [];
    if (!form.paper1) e.push("대표 논문 링크 1은 필수입니다");
    if (!form.paper2) e.push("대표 논문 링크 2는 필수입니다");
    if (!form.thesis) e.push("석사논문 또는 학술논문 링크는 필수입니다");
    const validLinks = [form.paper1, form.paper2, form.thesis].filter((l) => isUrl(l));
    if (validLinks.length < 2) e.push("가입 조건: 유효한 학술/석사 논문 링크가 최소 2편 이상 필요합니다 (http(s):// 형식)");
    if (form.orcid && !/^(https?:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(form.orcid.trim()))
      e.push("ORCID 형식이 올바르지 않습니다 (예: 0000-0002-1825-0097)");
    setErrors(e);
    return e.length === 0;
  }

  async function submitEnrollment() {
    try {
      const res = await fetch("/api/researcher/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setEnrollMsg(json.error || "신청 전송 실패."); return; }
      setEnrollMsg(json.persisted ? "가입 신청이 접수되었습니다 (관리자 승인 대기)." : "신청 접수 — 서버 미연결(데모).");
    } catch {
      setEnrollMsg("신청 전송 실패 — 로그인 후 다시 시도하세요.");
    }
    go(6);
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="max-w-[640px] mx-auto px-6 py-10">
        <Link href="/" className="flex items-center gap-2.5 mb-8">
          <BrandLogo size={32} radius={10} />
          <span className="font-nanum-myeongjo text-[17px] font-semibold">AI Research <span className="text-[#e8b84b]">OS</span></span>
        </Link>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8 flex-wrap">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-center gap-1">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: step >= s.n ? ACCENT : "#1a1e2a", color: step >= s.n ? "#070708" : "#5a627a" }}>{s.n}</span>
              {s.n < STEPS.length && <span className="w-4 h-[2px]" style={{ background: step > s.n ? ACCENT : "#1a1e2a" }} />}
            </div>
          ))}
        </div>

        <p className="text-[12px] font-mono mb-1" style={{ color: ACCENT }}>연구자 플랜 · Step {step}/7</p>
        <h1 className="text-[24px] font-bold tracking-tight mb-7">{STEPS[step - 1].label}</h1>

        {errors.length > 0 && (
          <div className="mb-5 p-3 rounded-[10px] bg-[#ff7066]/10 border border-[#ff7066]/20">
            {errors.map((e, i) => <p key={i} className="text-[13px] text-[#ffb0aa]">• {e}</p>)}
          </div>
        )}

        {/* Step 1 — 플랜 선택 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-5 rounded-[14px] border-2" style={{ borderColor: ACCENT, background: ACCENT + "10" }}>
              <p className="text-[16px] font-bold mb-1">연구자 플랜 (Researcher)</p>
              <p className="text-[13px] text-white/55 leading-relaxed">
                석사 후기·박사과정·연구자를 위한 AI-Research-OS 트랙. 논문 작성·문헌·검증 엔진을 모두 사용합니다.
                <br />가입 조건: <span className="text-white/80">학술/석사 논문 최소 2편 이상 링크 제출 + 검증</span>.
              </p>
            </div>
            <Link href="/rdos-signup" className="block p-4 rounded-[14px] border border-white/[0.08] hover:border-white/20 transition-colors">
              <p className="text-[14px] font-semibold text-white/70">연구준비자 플랜(RDOS)이신가요? →</p>
              <p className="text-[12px] text-white/40 mt-0.5">대학원 진학 예정자·석사과정생·연구 입문자용 교육 트랙</p>
            </Link>
            <NextBtn label="연구자 플랜으로 시작" onClick={() => go(2)} />
          </div>
        )}

        {/* Step 2 — 가입 정보 */}
        {step === 2 && (
          <div className="space-y-4">
            <Field label="이름" required value={form.name} onChange={(v) => set("name", v)} />
            <Field label="이메일" required type="email" value={form.email} onChange={(v) => set("email", v)} />
            <Field label="소속기관" required value={form.institution} onChange={(v) => set("institution", v)} placeholder="예: ○○대학교 / ○○연구소" />
            <Field label="연구분야" required value={form.field} onChange={(v) => set("field", v)} placeholder="예: HCI · 교육공학 · AI 윤리" />
            <div className="flex gap-2 pt-2">
              <BackBtn onClick={() => go(1)} />
              <NextBtn onClick={() => validateInfo() && go(3)} />
            </div>
          </div>
        )}

        {/* Step 3 — 논문 링크 / 학위 정보 */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-[13px] text-white/55 leading-relaxed">
              가입 조건: <span className="text-white/80">학술 논문 또는 석사논문 최소 2편 이상</span>의 링크를 제출하고 검증을 통과해야 합니다.
            </p>
            <Field label="ORCID (선택)" value={form.orcid} onChange={(v) => set("orcid", v)} placeholder="0000-0002-1825-0097" />
            <Field label="Google Scholar 링크 (선택)" value={form.scholar} onChange={(v) => set("scholar", v)} placeholder="https://scholar.google.com/..." />
            <Field label="대표 논문 링크 1" required value={form.paper1} onChange={(v) => set("paper1", v)} placeholder="https://doi.org/..." />
            <Field label="대표 논문 링크 2" required value={form.paper2} onChange={(v) => set("paper2", v)} placeholder="https://doi.org/..." />
            <Field label="석사논문 또는 학술논문 링크" required value={form.thesis} onChange={(v) => set("thesis", v)} placeholder="https://..." />
            <div className="flex gap-2 pt-2">
              <BackBtn onClick={() => go(2)} />
              <NextBtn label="검증 후 다음" onClick={() => validatePapers() && go(4)} />
            </div>
          </div>
        )}

        {/* Step 4 — 이메일 인증 */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-[14px] text-white/60">입력하신 이메일(<span className="text-white/85">{form.email}</span>)로 인증 메일을 보냅니다.</p>
            {!emailSent ? (
              <NextBtn label="인증 메일 보내기" onClick={() => setEmailSent(true)} />
            ) : (
              <div className="p-4 rounded-[12px] bg-[#5ebd7c]/10 border border-[#5ebd7c]/20 text-[13px] text-[#7fe6cf]">
                인증 메일을 전송했습니다. (데모에서는 바로 다음 단계로 진행)
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <BackBtn onClick={() => go(3)} />
              <NextBtn label="인증 완료" disabled={!emailSent} onClick={() => go(5)} />
            </div>
          </div>
        )}

        {/* Step 5 — 로그인 */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-[14px] text-white/60">Google · GitHub · 이메일 중 한 가지로 로그인하여 계정을 연결하세요.</p>
            <Link href={`/login?redirect_url=${encodeURIComponent("/researcher-signup")}`}
              className="block text-center py-3 rounded-[12px] font-semibold text-[#070708]" style={{ background: ACCENT }}>
              로그인 / 계정 연결 (Google · GitHub · Email)
            </Link>
            <p className="text-[12px] text-white/35">로그인 후 이 페이지로 돌아와 신청을 제출합니다.</p>
            <div className="flex gap-2 pt-2">
              <BackBtn onClick={() => go(4)} />
              <NextBtn label="로그인 완료 — 신청 제출" onClick={submitEnrollment} />
            </div>
          </div>
        )}

        {/* Step 6 — 관리자 승인 */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="p-5 rounded-[14px] bg-[#e8b84b]/10 border border-[#e8b84b]/20">
              <p className="text-[15px] font-semibold text-[#e8b84b] mb-1">관리자 승인 대기</p>
              <p className="text-[13px] text-white/60 leading-relaxed">
                {enrollMsg ?? "가입 신청이 접수되었습니다."} 논문 링크 검증과 관리자 승인 후 AI-Research-OS 이용이 시작됩니다.
              </p>
            </div>
            <NextBtn label="승인됨 (데모) — 진입" onClick={() => go(7)} />
          </div>
        )}

        {/* Step 7 — 서비스 진입 */}
        {step === 7 && (
          <div className="space-y-4 text-center py-6">
            <div className="text-[40px]">🎓</div>
            <h2 className="text-[20px] font-bold">AI-Research-OS에 오신 것을 환영합니다</h2>
            <p className="text-[13px] text-white/55">연구자 플랜이 활성화되면 RDOS(연구준비자 트랙)에도 함께 접근할 수 있습니다.</p>
            <Link href="/dashboard" className="inline-block px-6 py-3 rounded-[12px] font-semibold text-[#070708]" style={{ background: ACCENT }}>
              AI-Research-OS 시작하기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] text-white/60 mb-1.5">{label} {required && <span className="text-[#6c8cff]">*</span>}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-[10px] bg-[#0c0c0e] border border-white/[0.1] text-[14px] text-white placeholder-white/25 focus:border-[#6c8cff] focus:outline-none transition-colors" />
    </div>
  );
}
function NextBtn({ onClick, label = "다음", disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex-1 py-3 rounded-[12px] font-semibold text-[#070708] disabled:opacity-40 transition-all"
      style={{ background: ACCENT }}>{label}</button>
  );
}
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="px-5 py-3 rounded-[12px] font-semibold text-white/60 border border-white/[0.12] hover:border-white/30 transition-colors">이전</button>;
}
