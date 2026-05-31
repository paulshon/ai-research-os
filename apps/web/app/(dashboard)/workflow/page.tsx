"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useMemo, useCallback, useEffect } from "react";
import { WORKFLOW_PHASES, DEFAULT_TASKS } from "@/lib/research-data";
import { useTranslation } from "@/lib/i18n";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";

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
    <span className="px-3 py-1 rounded-md text-[11px] bg-[#6c8cff]/10 text-[#6c8cff] border border-[#6c8cff]/20 truncate max-w-[200px]">
      <Icon name="📁" className="inline-flex align-[-0.125em] mr-1" size={15} />{projectName}
    </span>
  );
}

interface Task { id: number; phase: string; title: string; done: boolean; }
interface PhaseSchedule { start: string; end: string; }

interface WorkflowDraft {
  tasks: Task[];
  newTaskTitle: string;
  newTaskPhase: string;
  projectStart: string;
  projectEnd: string;
  phaseSchedules: Record<string, PhaseSchedule>;
  showCalendar: boolean;
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

export default function WorkflowPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS.map(tk => ({ ...tk })));
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState("planning");
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [phaseSchedules, setPhaseSchedules] = useState<Record<string, PhaseSchedule>>({});
  const [showCalendar, setShowCalendar] = useState(false);

  const getData = useCallback(
    (): WorkflowDraft => ({
      tasks,
      newTaskTitle,
      newTaskPhase,
      projectStart,
      projectEnd,
      phaseSchedules,
      showCalendar,
    }),
    [tasks, newTaskTitle, newTaskPhase, projectStart, projectEnd, phaseSchedules, showCalendar]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as WorkflowDraft;
    if (d.tasks) setTasks(d.tasks);
    if (d.newTaskTitle !== undefined) setNewTaskTitle(d.newTaskTitle);
    if (d.newTaskPhase) setNewTaskPhase(d.newTaskPhase);
    if (d.projectStart !== undefined) setProjectStart(d.projectStart);
    if (d.projectEnd !== undefined) setProjectEnd(d.projectEnd);
    if (d.phaseSchedules) setPhaseSchedules(d.phaseSchedules);
    if (d.showCalendar !== undefined) setShowCalendar(d.showCalendar);
  }, []);

  const handleReset = useCallback(() => {
    setTasks(DEFAULT_TASKS.map((tk) => ({ ...tk })));
    setNewTaskTitle("");
    setNewTaskPhase("planning");
    setProjectStart("");
    setProjectEnd("");
    setPhaseSchedules({});
    setShowCalendar(false);
  }, []);

  usePagePersistence("workflow", handleLoad, handleReset);

  const localizedTasks = useMemo(
    () =>
      tasks.map((tk) => {
        const titleKey = TASK_TITLE_KEYS[tk.id];
        const fallback = DEFAULT_TASKS.find((d) => d.id === tk.id)?.title || "";
        return {
          ...tk,
          title: titleKey ? t(titleKey) : tk.title || fallback,
        };
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

  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <PageSaveRegistration pageId="workflow" getData={getData} />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[20px] font-bold font-nanum-myeongjo"><Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("workflow.title")}</h1>
          <div className="flex items-center gap-2">
            <ProjectFileLabel />
            <button onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13161e] border border-white/[0.06] text-[12px] text-white/50 hover:text-white/80 transition-colors">
              🗓 {t("workflow.schedule")}
            </button>
          </div>
        </div>
        <p className="text-[13px] text-white/35 mb-6">{t("workflow.desc")}</p>

        {showCalendar && (
          <div className="mb-6 p-4 rounded-2xl bg-[#13161e] border border-white/[0.06]">
            <p className="text-[13px] font-semibold mb-3">{t("workflow.scheduleTitle")}</p>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <p className="text-[11px] text-white/30 mb-1">{t("workflow.startDate")}</p>
                <input type="date" value={projectStart} onChange={e => setProjectStart(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white focus:outline-none focus:border-[#6c8cff]" />
              </div>
              <div>
                <p className="text-[11px] text-white/30 mb-1">{t("workflow.endDate")}</p>
                <input type="date" value={projectEnd} onChange={e => setProjectEnd(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white focus:outline-none focus:border-[#6c8cff]" />
              </div>
              <button onClick={autoDistribute} disabled={!projectStart || !projectEnd}
                className="px-4 py-2 bg-[#4a6cf7] text-white rounded-lg text-[12px] font-medium disabled:opacity-30">
                {t("workflow.autoDistribute")}
              </button>
            </div>
            <p className="text-[11px] text-white/25 mb-3">{t("workflow.adjustPhases")}</p>
            <div className="grid grid-cols-2 gap-2">
              {phases.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0d0f14] border border-white/[0.04]">
                  <span className="text-[14px]"><Icon name={p.icon} className="inline-flex align-[-0.125em]" size={15} /></span>
                  <span className="text-[11px] font-medium min-w-[48px]" style={{ color: p.color }}>{p.label}</span>
                  <input type="date" value={phaseSchedules[p.id]?.start || ""} onChange={e => updatePhaseSchedule(p.id, "start", e.target.value)}
                    className="flex-1 px-2 py-1 rounded-md bg-[#1a1e2a] border border-white/[0.04] text-[10px] text-white/50 focus:outline-none" />
                  <span className="text-[10px] text-white/20">~</span>
                  <input type="date" value={phaseSchedules[p.id]?.end || ""} onChange={e => updatePhaseSchedule(p.id, "end", e.target.value)}
                    className="flex-1 px-2 py-1 rounded-md bg-[#1a1e2a] border border-white/[0.04] text-[10px] text-white/50 focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 p-4 rounded-2xl bg-[#13161e] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px]">{t("workflow.progress")}</span>
            <span className="text-[14px] font-bold text-[#6c8cff]">{progress}%</span>
          </div>
          <div className="h-2 bg-[#1a1e2a] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#6c8cff] to-[#a78bfa] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] text-white/25 mt-1">{totalDone}/{localizedTasks.length} {t("workflow.completed")}</p>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {phases.map((p) => {
            const phaseTasks = localizedTasks.filter(tk => tk.phase === p.id);
            const phaseDone = phaseTasks.filter(tk => tk.done).length;
            const pct = phaseTasks.length ? Math.round((phaseDone / phaseTasks.length) * 100) : 0;
            const sched = phaseSchedules[p.id];
            return (
              <div key={p.id} className="flex-shrink-0 w-28 p-3 rounded-xl bg-[#13161e] border border-white/[0.04] text-center">
                <p className="text-[16px]"><Icon name={p.icon} className="inline-flex align-[-0.125em]" size={15} /></p>
                <p className="text-[11px] font-medium mt-1">{p.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: p.color }}>{pct}%</p>
                {sched?.start && <p className="text-[9px] text-white/20 mt-1 leading-tight">{sched.start}<br/>~{sched.end}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mb-4">
          <select value={newTaskPhase} onChange={(e) => setNewTaskPhase(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white/60">
            {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="flex-1 px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none"
            placeholder={t("workflow.newTaskPlaceholder")} />
          <button onClick={addTask} className="px-4 py-2 bg-[#4a6cf7] text-white rounded-lg text-[12px] font-medium">{t("workflow.add")}</button>
        </div>

        {phases.map((phase) => {
          const phaseTasks = localizedTasks.filter(tk => tk.phase === phase.id);
          if (phaseTasks.length === 0) return null;
          const sched = phaseSchedules[phase.id];
          return (
            <div key={phase.id} className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[12px] font-medium" style={{ color: phase.color }}><Icon name={phase.icon} className="inline-flex align-[-0.125em]" size={15} /> {phase.label}</p>
                {sched?.start && <span className="text-[10px] text-white/25 bg-white/[0.03] px-2 py-0.5 rounded">{sched.start} ~ {sched.end}</span>}
              </div>
              <div className="space-y-1">
                {phaseTasks.map((tk) => (
                  <button key={tk.id} onClick={() => toggleTask(tk.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${tk.done ? "bg-white/[0.02] text-white/25 line-through" : "bg-[#13161e] text-white/70 border border-white/[0.04]"}`}>
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-[10px] ${tk.done ? "border-[#5ebd7c] bg-[#5ebd7c]/20 text-[#5ebd7c]" : "border-white/10"}`}>{tk.done && <Icon name="check" size={12} />}</span>
                    <span className="text-[13px]">{tk.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
