"use client";

/* ════════════════════════════════════════════════════════════
   연구방법 → 논문 작성 삽입 패널
   - 연구방법 엔진(예: 혼합 질적내용분석)에서 생성·전달한 절을 보여주고
   - 항목 클릭 시 본문 에디터 커서 위치에 해당 절을 삽입한다.
   - METHOD_OUTPUTS_EVENT 로 실시간 갱신된다.
═══════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  loadMethodOutput,
  METHOD_OUTPUTS_EVENT,
  type MethodOutput,
} from "@/lib/method/bridge";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 선택한 절 텍스트를 에디터에 삽입 */
  onInsert: (text: string) => void;
}

export default function MethodInsertPanel({ open, onClose, onInsert }: Props) {
  const [output, setOutput] = useState<MethodOutput | null>(null);

  const refresh = useCallback(() => setOutput(loadMethodOutput()), []);

  useEffect(() => {
    if (!open) return;
    refresh();
    window.addEventListener(METHOD_OUTPUTS_EVENT, refresh);
    return () => window.removeEventListener(METHOD_OUTPUTS_EVENT, refresh);
  }, [open, refresh]);

  if (!open) return null;

  const insertSection = (title: string, body: string) => {
    onInsert(`\n${title}\n${body}\n`);
  };
  const insertAll = () => {
    if (!output) return;
    const all = output.sections.map((s) => `${s.title}\n${s.body}`).join("\n\n");
    onInsert(`\n${all}\n`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end font-nanum-gothic">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f1218] border-l border-white/[0.08] h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#0f1218] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#3ecfb222", color: "#3ecfb2" }}>
              <Icon name="method" size={15} />
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold text-[#e8eaf0]">연구방법 절 삽입</p>
              <p className="text-[12px] text-white/30">연구방법 엔진에서 생성한 절</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-4">
          {!output || !output.sections.length ? (
            <div className="text-center py-10">
              <Icon name="method" size={36} className="text-white/15 mx-auto mb-3" />
              <p className="text-[14px] text-white/45 mb-1">전달된 연구방법 결과가 없습니다.</p>
              <p className="text-[13px] text-white/30 mb-4 leading-relaxed">
                연구방법 엔진에서 분석을 실행한 뒤<br />‘논문 작성에 적용’을 누르면 여기에 나타납니다.
              </p>
              <Link href="/method/qca" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3ecfb2]/15 text-[#7fe6d0] text-[13px] hover:bg-[#3ecfb2]/25 transition-colors">
                <Icon name="arrowRight" size={13} /> 혼합 질적내용분석 열기
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[13px] text-[#e8eaf0]">{output.methodName}</p>
                <p className="text-[12px] text-white/35">{output.projectName} · {new Date(output.savedAt).toLocaleString("ko-KR")}</p>
              </div>
              <button onClick={insertAll} className="w-full mb-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#3ecfb2] text-[#08120f] text-[14px] font-semibold hover:brightness-110 transition-all">
                <Icon name="plus" size={14} /> 전체 절 삽입
              </button>
              <div className="space-y-2">
                {output.sections.map((s) => (
                  <div key={s.key} className="rounded-xl bg-[#13161e] border border-white/[0.05] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[14px] font-semibold text-[#e8eaf0]">{s.title}</p>
                      <button onClick={() => insertSection(s.title, s.body)} className="text-[12px] px-2 py-1 rounded-lg bg-[#3ecfb2]/15 text-[#7fe6d0] hover:bg-[#3ecfb2]/25 transition-colors inline-flex items-center gap-1">
                        <Icon name="plus" size={12} /> 삽입
                      </button>
                    </div>
                    <p className="text-[12px] text-white/45 leading-relaxed line-clamp-4 whitespace-pre-wrap">{s.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
