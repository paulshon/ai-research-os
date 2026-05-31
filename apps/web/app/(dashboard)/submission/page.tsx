"use client";
import { Icon } from "@/components/ui/icon";
import { useMemo, useState } from "react";

const CHECKLIST = [
  { label: "논문 형식 검증", done: false, score: 0 },
  { label: "참고문헌 정리", done: false, score: 0 },
  { label: "초록 작성", done: false, score: 0 },
  { label: "그림/표 캡션", done: false, score: 0 },
  { label: "표절 검사", done: false, score: 0 },
  { label: "커버레터", done: false, score: 0 },
];

export default function SubmissionPage() {
  const [checklist, setChecklist] = useState(CHECKLIST);
  const [newItem, setNewItem] = useState("");
  const readiness = useMemo(() => Math.round(checklist.reduce((a, c) => a + c.score, 0) / checklist.length), [checklist]);

  const toggleItem = (label: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.label === label
          ? { ...item, done: !item.done, score: item.done ? Math.max(item.score - 20, 0) : Math.min(item.score + 20, 100) }
          : item
      )
    );
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setChecklist((prev) => [...prev, { label: newItem.trim(), done: false, score: 0 }]);
    setNewItem("");
  };

  const exportContent = (format: "pdf" | "word" | "latex") => {
    const writingDraft = localStorage.getItem("aros-page-writing") || "논문 본문 데이터가 없습니다.";
    const payload = format === "latex" ? `\\section{논문 초안}\n${writingDraft}` : writingDraft;
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = format === "pdf" ? "thesis-export.txt" : format === "word" ? "thesis-export.md" : "thesis-export.tex";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] text-white/20 font-mono mb-1">Submission — AI Research OS</p>
        <h1 className="font-nanum-myeongjo text-[22px] font-bold text-[#e8eaf0] mb-1">제출 준비</h1>
        <p className="text-[13px] text-white/35 mb-6">논문 제출 전 최종 점검 체크리스트</p>

        {/* 준비도 */}
        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-6 flex items-center gap-4">
          <div className="text-center min-w-[80px]">
            <p className="text-[36px] font-bold text-[#e8b84b]">{readiness}%</p>
            <p className="text-[11px] text-white/30">제출 준비도</p>
          </div>
          <div className="flex-1 h-3 rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#e8b84b] to-[#5ebd7c] transition-all" style={{ width: `${readiness}%` }} />
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-6">
          <p className="text-[13px] font-semibold text-[#e8eaf0] mb-4">최종 체크리스트</p>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button key={item.label} onClick={() => toggleItem(item.label)} className="w-full flex items-center gap-3 p-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.04] text-left">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  item.done ? "bg-[#5ebd7c]/20 text-[#5ebd7c]" : "bg-white/[0.04] text-white/20"
                }`}>
                  {item.done ? <Icon name="check" size={14} /> : <Icon name="circle" size={14} />}
                </span>
                <span className={`flex-1 text-[13px] ${item.done ? "text-white/60" : "text-white/35"}`}>{item.label}</span>
                <span className="text-[11px] text-white/25">{item.score}%</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()}
              className="flex-1 px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white focus:outline-none focus:border-[#e8b84b]"
              placeholder="체크리스트 항목 추가" />
            <button onClick={addItem} className="px-3 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] text-[12px]">추가</button>
          </div>
        </div>

      </div>
    </div>
  );
}
