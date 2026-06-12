"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useMemo, useCallback, useEffect } from "react";
import { WORKFLOW_PHASES, DEFAULT_TASKS } from "@/lib/research-data";
import { useTranslation } from "@/lib/i18n";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";

/* ─────────────────────────────────────────────
   v41: 논문일정 (Paper Schedule)
   - 기존 「워크플로우」 + 「제출 준비」 메뉴를 하나로 통합.
   - 상단: 8단계 연구 일정/진행률/태스크 (구 워크플로우)
   - 하단: 제출 전 최종 점검 체크리스트 + 내보내기 (구 제출 준비)
   - 사이드바에서는 검토·검증 바로 아래(Research Flow)에 배치됨.
───────────────────────────────────────────── */

function ProjectFileLabel() {
  const [projectName, setProjectName] = useState("");
  useEffect(() => {
    const name = localStorage.getItem("aros-project-name") || "";
    setProjectName(name);
    const handler = () => {
      setProjectName(localStorage.getItem("aros-project-name") || "");
    };
    window.addEventListener("aros:project-loaded", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("aros:project-loaded", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  if (!projectName) return null;
  return (
    <span className="px-3 py-1 rounded-md text-[14px] bg-[#6c8cff]/10 text-[#6c8cff] border border-[#6c8cff]/20 truncate max-w-[200px]">
      <Icon name="📁" className="inline-flex align-[-0.125em] mr-1" size={15} />{projectName}
    </span>
  );
}

interface Task { id: number; phase: string; title: string; done: boolean; }
interface PhaseSchedule { start: string; end: string; }
interface ChecklistItem { label: string; done: boolean; score: number; }

interface ScheduleDraft {
  tasks: Task[];
  newTaskTitle: string;
  newTaskPhase: string;
  projectStart: string;
  projectEnd: string;
  phaseSchedules: Record<string, PhaseSchedule>;
  showCalendar: boolean;
  checklist: ChecklistItem[];
  newItem: string;
}

const PHASE_LABEL_KEYS: Record<string, string> = {
  planning: "workflow.phasePlanning",
  literature: "workflow.phaseLiterature",
  methodology: "workflow.phaseMethodology",
  collection: "workflow.phaseCollection",
  analysis: "workflow.phaseAnalysis",
  writing: "workflow.phaseWriting",
  revision: "workflow.phaseRevision",
  submission: "workflow.phaseSubmission",
};

const TASK_TITLE_KEYS: Record<number, string> = {
  1: "workflow.task1", 2: "workflow.task2", 3: "workflow.task3", 4: "workflow.task4",
  5: "workflow.task5", 6: "workflow.task6", 7: "workflow.task7", 8: "workflow.task8",
  9: "workflow.task9", 10: "workflow.task10", 11: "workflow.task11", 12: "workflow.task12",
  13: "workflow.task13", 14: "workflow.task14", 15: "workflow.task15", 16: "workflow.task16",
  17: "workflow.task17", 18: "workflow.task18",
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: "논문 형식 검증", done: false, score: 0 },
  { label: "참고문헌 정리", done: false, score: 0 },
  { label: "초록 작성", done: false, score: 0 },
  { label: "그림/표 캡션", done: false, score: 0 },
  { label: "표절 검사", done: false, score: 0 },
  { label: "맞춤법 검사", done: false, score: 0 },
  { label: "AI 생성 탐지 확인", done: false, score: 0 },
  { label: "커버레터", done: false, score: 0 },
];

export default function SchedulePage() {
  const { t } = useTranslation();

  // ── 일정/태스크 (구 워크플로우) ──
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS.map(tk => ({ ...tk })));
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState("planning");
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [phaseSchedules, setPhaseSchedules] = useState<Record<string, PhaseSchedule>>({});
  const [showCalendar, setShowCalendar] = useState(false);

  // ── 제출 체크리스트 (구 제출 준비) ──
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST.map(c => ({ ...c })));
  const [newItem, setNewItem] = useState("");

  const getData = useCallback(
    (): ScheduleDraft => ({
      tasks, newTaskTitle, newTaskPhase, projectStart, projectEnd,
      phaseSchedules, showCalendar, checklist, newItem,
    }),
    [tasks, newTaskTitle, newTaskPhase, projectStart, projectEnd, phaseSchedules, showCalendar, checklist, newItem]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as ScheduleDraft;
    if (d.tasks) setTasks(d.tasks);
    if (d.newTaskTitle !== undefined) setNewTaskTitle(d.newTaskTitle);
    if (d.newTaskPhase) setNewTaskPhase(d.newTaskPhase);
    if (d.projectStart !== undefined) setProjectStart(d.projectStart);
    if (d.projectEnd !== undefined) setProjectEnd(d.projectEnd);
    if (d.phaseSchedules) setPhaseSchedules(d.phaseSchedules);
    if (d.showCalendar !== undefined) setShowCalendar(d.showCalendar);
    if (d.checklist) setChecklist(d.checklist);
    if (d.newItem !== undefined) setNewItem(d.newItem);
  }, []);

  const handleReset = useCallback(() => {
    setTasks(DEFAULT_TASKS.map((tk) => ({ ...tk })));
    setNewTaskTitle("");
    setNewTaskPhase("planning");
    setProjectStart("");
    setProjectEnd("");
    setPhaseSchedules({});
    setShowCalendar(false);
    setChecklist(DEFAULT_CHECKLIST.map(c => ({ ...c })));
    setNewItem("");
  }, []);

  usePagePersistence("schedule", handleLoad, handleReset);

  const localizedTasks = useMemo(
    () =>
      tasks.map((tk) => {
        const titleKey = TASK_TITLE_KEYS[tk.id];
        const fallback = DEFAULT_TASKS.find((d) => d.id === tk.id)?.title || "";
        return { ...tk, title: titleKey ? t(titleKey) : tk.title || fallback };
      }),
    [tasks, t]
  );

  const phases = useMemo(() =>
    WORKFLOW_PHASES.map(p => ({
      ...p,
      label: PHASE_LABEL_KEYS[p.id] ? t(PHASE_LABEL_KEYS[p.id]) : p.label,
    })),
  [t]);

  const toggleTask = (id: number) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk));

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), phase: newTaskPhase, title: newTaskTitle.trim(), done: false }]);
    setNewTaskTitle("");
  };

  const totalDone = localizedTasks.filter(tk => tk.done).length;
  const progress = localizedTasks.length ? Math.round((totalDone / localizedTasks.length) * 100) : 0;

  const autoDistribute = () => {
    if (!projectStart || !projectEnd) return;
    const start = new Date(projectStart);
    const end = new Date(projectEnd);
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const perPhase = Math.floor(totalDays / phases.length);
    const schedules: Record<string, PhaseSchedule> = {};
    phases.forEach((p, i) => {
      schedules[p.id] = {
        start: new Date(start.getTime() + i * perPhase * 86400000).toISOString().slice(0, 10),
        end: new Date(start.getTime() + (i + 1) * perPhase * 86400000 - 86400000).toISOString().slice(0, 10),
      };
    });
    setPhaseSchedules(schedules);
    setShowCalendar(false);
  };

  const updatePhaseSchedule = (phaseId: string, field: "start" | "end", value: string) => {
    setPhaseSchedules(prev => ({ ...prev, [phaseId]: { ...(prev[phaseId] || { start: "", end: "" }), [field]: value } }));
  };

  // ── 제출 체크리스트 로직 ──
  const readiness = useMemo(
    () => (checklist.length ? Math.round(checklist.reduce((a, c) => a + c.score, 0) / checklist.length) : 0),
    [checklist]
  );

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
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <PageSaveRegistration pageId="schedule" getData={getData} />
      <div className="max-w-[1680px] mx-auto flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[23px] font-bold font-nanum-myeongjo"><Icon name="calendar" className="inline-flex align-[-0.125em] mr-1" size={18} /> 논문일정</h1>
          <div className="flex items-center gap-2">
            <ProjectFileLabel />
            <button onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13161e] border border-white/[0.06] text-[15px] text-white/50 hover:text-white/80 transition-colors">
              <Icon name="calendar" size={13} className="inline-flex align-[-0.125em]" /> {t("workflow.schedule")}
            </button>
          </div>
        </div>
        <p className="text-[16px] text-white/35 mb-6">8단계 연구 일정 관리 · 제출 전 최종 점검을 한곳에서</p>

        {showCalendar && (
          <div className="mb-6 p-4 rounded-2xl bg-[#13161e] border border-white/[0.06]">
            <p className="text-[16px] font-semibold mb-3">{t("workflow.scheduleTitle")}</p>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <p className="text-[14px] text-white/30 mb-1">{t("workflow.startDate")}</p>
                <input type="date" value={projectStart} onChange={e => setProjectStart(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white focus:outline-none focus:border-[#6c8cff]" />
              </div>
              <div>
                <p className="text-[14px] text-white/30 mb-1">{t("workflow.endDate")}</p>
                <input type="date" value={projectEnd} onChange={e => setProjectEnd(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white focus:outline-none focus:border-[#6c8cff]" />
              </div>
              <button onClick={autoDistribute} disabled={!projectStart || !projectEnd}
                className="px-4 py-2 bg-[#4a6cf7] text-white rounded-lg text-[15px] font-medium disabled:opacity-30">
                {t("workflow.autoDistribute")}
              </button>
            </div>
            <p className="text-[14px] text-white/25 mb-3">{t("workflow.adjustPhases")}</p>
            <div className="grid grid-cols-2 gap-2">
              {phases.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0d0f14] border border-white/[0.04]">
                  <span className="text-[17px]"><Icon name={p.icon} className="inline-flex align-[-0.125em]" size={15} /></span>
                  <span className="text-[14px] font-medium min-w-[48px]" style={{ color: p.color }}>{p.label}</span>
                  <input type="date" value={phaseSchedules[p.id]?.start || ""} onChange={e => updatePhaseSchedule(p.id, "start", e.target.value)}
                    className="flex-1 px-2 py-1 rounded-md bg-[#1a1e2a] border border-white/[0.04] text-[13px] text-white/50 focus:outline-none" />
                  <span className="text-[13px] text-white/20">~</span>
                  <input type="date" value={phaseSchedules[p.id]?.end || ""} onChange={e => updatePhaseSchedule(p.id, "end", e.target.value)}
                    className="flex-1 px-2 py-1 rounded-md bg-[#1a1e2a] border border-white/[0.04] text-[13px] text-white/50 focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 p-4 rounded-2xl bg-[#13161e] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[16px]">{t("workflow.progress")}</span>
            <span className="text-[17px] font-bold text-[#6c8cff]">{progress}%</span>
          </div>
          <div className="h-2 bg-[#1a1e2a] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#6c8cff] to-[#a78bfa] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[14px] text-white/25 mt-1">{totalDone}/{localizedTasks.length} {t("workflow.completed")}</p>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {phases.map((p) => {
            const phaseTasks = localizedTasks.filter(tk => tk.phase === p.id);
            const phaseDone = phaseTasks.filter(tk => tk.done).length;
            const pct = phaseTasks.length ? Math.round((phaseDone / phaseTasks.length) * 100) : 0;
            const sched = phaseSchedules[p.id];
            return (
              <div key={p.id} className="flex-shrink-0 w-28 p-3 rounded-xl bg-[#13161e] border border-white/[0.04] text-center">
                <p className="text-[19px]"><Icon name={p.icon} className="inline-flex align-[-0.125em]" size={15} /></p>
                <p className="text-[14px] font-medium mt-1">{p.label}</p>
                <p className="text-[13px] mt-0.5" style={{ color: p.color }}>{pct}%</p>
                {sched?.start && <p className="text-[12px] text-white/20 mt-1 leading-tight">{sched.start}<br/>~{sched.end}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mb-4">
          <select value={newTaskPhase} onChange={(e) => setNewTaskPhase(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white/60">
            {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="flex-1 px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[16px] text-white focus:border-[#6c8cff] focus:outline-none"
            placeholder={t("workflow.newTaskPlaceholder")} />
          <button onClick={addTask} className="px-4 py-2 bg-[#4a6cf7] text-white rounded-lg text-[15px] font-medium">{t("workflow.add")}</button>
        </div>

        {phases.map((phase) => {
          const phaseTasks = localizedTasks.filter(tk => tk.phase === phase.id);
          if (phaseTasks.length === 0) return null;
          const sched = phaseSchedules[phase.id];
          return (
            <div key={phase.id} className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[15px] font-medium" style={{ color: phase.color }}><Icon name={phase.icon} className="inline-flex align-[-0.125em]" size={15} /> {phase.label}</p>
                {sched?.start && <span className="text-[13px] text-white/25 bg-white/[0.03] px-2 py-0.5 rounded">{sched.start} ~ {sched.end}</span>}
              </div>
              <div className="space-y-1">
                {phaseTasks.map((tk) => (
                  <button key={tk.id} onClick={() => toggleTask(tk.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${tk.done ? "bg-white/[0.02] text-white/25 line-through" : "bg-[#13161e] text-white/70 border border-white/[0.04]"}`}>
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-[13px] ${tk.done ? "border-[#5ebd7c] bg-[#5ebd7c]/20 text-[#5ebd7c]" : "border-white/10"}`}>{tk.done && <Icon name="check" size={12} />}</span>
                    <span className="text-[16px]">{tk.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* ════════ 제출 전 최종 점검 (구 제출 준비 페이지 통합) ════════ */}
        <div className="mt-10 mb-3 flex items-center gap-2">
          <Icon name="submission" size={16} className="text-[#e8b84b]" />
          <h2 className="text-[19px] font-bold font-nanum-myeongjo">제출 전 최종 점검</h2>
          <span className="text-[14px] text-white/30">논문 제출 전 최종 체크리스트</span>
        </div>

        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-6 flex items-center gap-4">
          <div className="text-center min-w-[80px]">
            <p className="text-[39px] font-bold text-[#e8b84b]">{readiness}%</p>
            <p className="text-[14px] text-white/30">제출 준비도</p>
          </div>
          <div className="flex-1 h-3 rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#e8b84b] to-[#5ebd7c] transition-all" style={{ width: `${readiness}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-6">
          <p className="text-[16px] font-semibold text-[#e8eaf0] mb-4">최종 체크리스트</p>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button key={item.label} onClick={() => toggleItem(item.label)} className="w-full flex items-center gap-3 p-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.04] text-left">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[14px] ${
                  item.done ? "bg-[#5ebd7c]/20 text-[#5ebd7c]" : "bg-white/[0.04] text-white/20"
                }`}>
                  {item.done ? <Icon name="check" size={14} /> : <Icon name="circle" size={14} />}
                </span>
                <span className={`flex-1 text-[16px] ${item.done ? "text-white/60" : "text-white/35"}`}>{item.label}</span>
                <span className="text-[14px] text-white/25">{item.score}%</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()}
              className="flex-1 px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white focus:outline-none focus:border-[#e8b84b]"
              placeholder="체크리스트 항목 추가" />
            <button onClick={addItem} className="px-3 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] text-[15px]">추가</button>
          </div>
        </div>

        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
          <p className="text-[16px] font-semibold text-[#e8eaf0] mb-4">원고 내보내기</p>
          <div className="flex flex-wrap gap-2">
            {([
              { fmt: "pdf" as const, label: "PDF (.txt)", color: "#ff7066" },
              { fmt: "word" as const, label: "Word (.md)", color: "#6c8cff" },
              { fmt: "latex" as const, label: "LaTeX (.tex)", color: "#3ecfb2" },
            ]).map((b) => (
              <button key={b.fmt} onClick={() => exportContent(b.fmt)}
                style={{ color: b.color, borderColor: `${b.color}40`, backgroundColor: `${b.color}14` }}
                className="px-4 py-2 rounded-lg border text-[15px] font-medium hover:brightness-125 transition-all flex items-center gap-1.5">
                <Icon name="download" size={13} /> {b.label}
              </button>
            ))}
          </div>
          <p className="text-[14px] text-white/25 mt-3">논문 작성 메뉴에서 저장한 본문이 내보내기에 포함됩니다.</p>
        </div>
        </div>{/* /flex-1 main */}

        {/* v42: 우측 컨텍스트 패널 — 빈 우측 공간을 일정 요약으로 채움 */}
        <aside className="w-full xl:w-[320px] flex-shrink-0 xl:sticky xl:top-4 space-y-3">
          <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
            <p className="text-[13px] font-semibold text-white/70 mb-3">전체 현황</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `conic-gradient(#6c8cff ${progress * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}>
                <div className="w-12 h-12 rounded-full bg-[#13161e] flex items-center justify-center">
                  <span className="text-[15px] font-bold text-[#6c8cff]">{progress}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-white/55">완료 태스크</p>
                <p className="text-[20px] font-bold text-[#e8eaf0] leading-tight">{totalDone}<span className="text-[13px] text-white/30 font-normal"> / {localizedTasks.length}</span></p>
                <p className="text-[11px] text-white/30 mt-0.5">제출 준비도 {readiness}%</p>
              </div>
            </div>
            <div className="space-y-2">
              {phases.map((p) => {
                const pt = localizedTasks.filter((tk) => tk.phase === p.id);
                const pd = pt.filter((tk) => tk.done).length;
                const pct = pt.length ? Math.round((pd / pt.length) * 100) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-[11px] w-14 truncate" style={{ color: p.color }}>{p.label}</span>
                    <div className="flex-1 h-1.5 bg-[#1a1e2a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                    </div>
                    <span className="text-[10px] tabular-nums w-7 text-right text-white/40">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
            <p className="text-[13px] font-semibold text-white/70 mb-2.5 flex items-center gap-1.5"><Icon name="checklist" size={14} /> 다음 할 일</p>
            {localizedTasks.filter((tk) => !tk.done).length === 0 ? (
              <p className="text-[12px] text-white/30 py-1">모든 태스크를 완료했습니다 🎉</p>
            ) : (
              <div className="space-y-1.5">
                {localizedTasks.filter((tk) => !tk.done).slice(0, 6).map((tk) => {
                  const ph = phases.find((p) => p.id === tk.phase);
                  return (
                    <button key={tk.id} onClick={() => toggleTask(tk.id)}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                      <span className="w-3.5 h-3.5 rounded-[5px] border border-white/15 flex-shrink-0" />
                      <span className="flex-1 text-[12px] text-white/60 truncate">{tk.title}</span>
                      <span className="text-[9px]" style={{ color: ph?.color }}>{ph?.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#6c8cff]/[0.08] to-[#a78bfa]/[0.05] border border-[#6c8cff]/15">
            <p className="text-[13px] font-semibold text-[#8aa4ff] mb-2 flex items-center gap-1.5"><Icon name="logo" size={14} /> AI 추천</p>
            <ul className="space-y-1.5 text-[12px] text-white/55">
              <li className="flex items-start gap-1.5"><span className="text-[#6c8cff] mt-0.5">→</span><span>‘일정 설정’으로 전체 기간을 분배하면 단계별 마감이 자동 계산됩니다.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-[#6c8cff] mt-0.5">→</span><span>현재 단계의 미완료 태스크를 먼저 처리하세요.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-[#6c8cff] mt-0.5">→</span><span>제출 전 ‘최종 점검’ 체크리스트를 모두 완료하세요.</span></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
