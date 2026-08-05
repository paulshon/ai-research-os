"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EMPTY_PROJECT,
  type LiteratureItem,
  type ManuscriptBlock,
  type MethodDesign,
  type Milestone,
  type Outline,
  type ProjectState,
  type ResearchDesign,
  type RqCandidate,
  type Snippet,
  type ThesisType,
  type ValidationRun,
} from "./flow";
import { buildDemoProject } from "./seed";

/**
 * 연구자 트랙의 명시적 프로젝트 상태 스토어.
 * localStorage 는 오프라인 임시 버퍼로만 쓰고, UI 에는 "N분 전 저장됨" 한 줄만 노출한다.
 * 서버 자동 저장이 정본이지만, 이 개편에서는 클라이언트 스토어를 먼저 정착시킨다.
 */
type Actions = {
  setName: (name: string) => void;
  setResearchDesign: (patch: Partial<ResearchDesign>) => void;
  adoptRq: (id: string) => void;
  addRqCandidate: (c: RqCandidate) => void;
  updateRqCandidate: (id: string, patch: Partial<RqCandidate>) => void;
  setMethodDesign: (patch: Partial<MethodDesign>) => void;
  setThesisType: (t: ThesisType) => void;
  setOutline: (o: Outline) => void;
  upsertBlock: (b: ManuscriptBlock) => void;
  acceptAiBlock: (id: string) => void;
  discardAiBlock: (id: string) => void;
  retryAiBlock: (id: string, content: string) => void;
  setLiterature: (items: LiteratureItem[]) => void;
  addLiteratureItem: (item: LiteratureItem) => void;
  updateLiteratureItem: (id: string, patch: Partial<LiteratureItem>) => void;
  toggleLiteratureLibrary: (id: string) => void;
  setSchedule: (patch: Partial<{ milestones: Milestone[]; dueDate: string | null }>) => void;
  upsertMilestone: (m: Milestone) => void;
  toggleMilestoneDone: (id: string) => void;
  addSnippet: (s: Snippet) => void;
  updateSnippet: (id: string, patch: Partial<Snippet>) => void;
  removeSnippet: (id: string) => void;
  useSnippet: (id: string) => void;
  addValidationRun: (run: ValidationRun) => void;
  resolveFinding: (rule: string) => void;
  ignoreFinding: (rule: string) => void;
  unignoreFinding: (rule: string) => void;
  unresolveFinding: (rule: string) => void;
  seedIfEmpty: () => void;
  touchSaved: () => void;
  reset: () => void;
};

export const useProjectStore = create<ProjectState & Actions>()(
  persist(
    (set, get) => ({
      ...EMPTY_PROJECT,
      setName: (name) => set({ name, savedAt: new Date().toISOString() }),
      setResearchDesign: (patch) =>
        set({
          researchDesign: { ...get().researchDesign, ...patch },
          savedAt: new Date().toISOString(),
        }),
      adoptRq: (id) =>
        set({
          researchDesign: {
            ...get().researchDesign,
            adoptedRqId: id,
            rqCandidates: get().researchDesign.rqCandidates.map((c) => ({
              ...c,
              adopted: c.id === id,
            })),
          },
          savedAt: new Date().toISOString(),
        }),
      addRqCandidate: (c) =>
        set({
          researchDesign: {
            ...get().researchDesign,
            rqCandidates: [...get().researchDesign.rqCandidates, c],
          },
          savedAt: new Date().toISOString(),
        }),
      updateRqCandidate: (id, patch) =>
        set({
          researchDesign: {
            ...get().researchDesign,
            rqCandidates: get().researchDesign.rqCandidates.map((c) =>
              c.id === id ? { ...c, ...patch } : c,
            ),
          },
          savedAt: new Date().toISOString(),
        }),
      setMethodDesign: (patch) =>
        set({
          methodDesign: { ...get().methodDesign, ...patch },
          savedAt: new Date().toISOString(),
        }),
      setThesisType: (t) => set({ thesisType: t, savedAt: new Date().toISOString() }),
      setOutline: (o) => set({ outline: o, savedAt: new Date().toISOString() }),
      upsertBlock: (b) => {
        const list = get().manuscript;
        const i = list.findIndex((x) => x.id === b.id);
        const next = i >= 0 ? list.map((x, idx) => (idx === i ? b : x)) : [...list, b];
        set({ manuscript: next, savedAt: new Date().toISOString() });
      },
      acceptAiBlock: (id) =>
        set({
          manuscript: get().manuscript.map((b) =>
            b.id === id ? { ...b, accepted: true, origin: "human" } : b,
          ),
          savedAt: new Date().toISOString(),
        }),
      discardAiBlock: (id) =>
        set({
          manuscript: get().manuscript.filter((b) => b.id !== id),
          savedAt: new Date().toISOString(),
        }),
      retryAiBlock: (id, content) =>
        set({
          manuscript: get().manuscript.map((b) => (b.id === id ? { ...b, content } : b)),
          savedAt: new Date().toISOString(),
        }),
      setLiterature: (items) => set({ literature: items, savedAt: new Date().toISOString() }),
      addLiteratureItem: (item) =>
        set({ literature: [item, ...get().literature], savedAt: new Date().toISOString() }),
      updateLiteratureItem: (id, patch) =>
        set({
          literature: get().literature.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          savedAt: new Date().toISOString(),
        }),
      toggleLiteratureLibrary: (id) =>
        set({
          literature: get().literature.map((l) =>
            l.id === id ? { ...l, inLibrary: !l.inLibrary } : l,
          ),
          savedAt: new Date().toISOString(),
        }),
      setSchedule: (patch) =>
        set({ schedule: { ...get().schedule, ...patch }, savedAt: new Date().toISOString() }),
      upsertMilestone: (m) => {
        const list = get().schedule.milestones;
        const i = list.findIndex((x) => x.id === m.id);
        const next = i >= 0 ? list.map((x, idx) => (idx === i ? m : x)) : [...list, m];
        set({ schedule: { ...get().schedule, milestones: next }, savedAt: new Date().toISOString() });
      },
      toggleMilestoneDone: (id) =>
        set({
          schedule: {
            ...get().schedule,
            milestones: get().schedule.milestones.map((m) =>
              m.id === id ? { ...m, done: !m.done } : m,
            ),
          },
          savedAt: new Date().toISOString(),
        }),
      addSnippet: (s) => set({ snippets: [s, ...get().snippets], savedAt: new Date().toISOString() }),
      updateSnippet: (id, patch) =>
        set({
          snippets: get().snippets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          savedAt: new Date().toISOString(),
        }),
      removeSnippet: (id) =>
        set({ snippets: get().snippets.filter((s) => s.id !== id), savedAt: new Date().toISOString() }),
      useSnippet: (id) =>
        set({
          snippets: get().snippets.map((s) => (s.id === id ? { ...s, useCount: s.useCount + 1 } : s)),
          savedAt: new Date().toISOString(),
        }),
      addValidationRun: (run) =>
        set({ validationRuns: [...get().validationRuns, run], savedAt: new Date().toISOString() }),
      resolveFinding: (rule) => {
        const runs = get().validationRuns;
        if (!runs.length) return;
        const last = runs[runs.length - 1];
        const nextLast: ValidationRun = {
          ...last,
          findings: last.findings.map((f) => (f.rule === rule ? { ...f, resolved: true } : f)),
        };
        set({
          validationRuns: [...runs.slice(0, -1), nextLast],
          savedAt: new Date().toISOString(),
        });
      },
      ignoreFinding: (rule) => {
        const runs = get().validationRuns;
        if (!runs.length) return;
        const last = runs[runs.length - 1];
        const nextLast: ValidationRun = {
          ...last,
          findings: last.findings.map((f) => (f.rule === rule ? { ...f, ignored: true } : f)),
        };
        set({ validationRuns: [...runs.slice(0, -1), nextLast], savedAt: new Date().toISOString() });
      },
      unignoreFinding: (rule) => {
        const runs = get().validationRuns;
        if (!runs.length) return;
        const last = runs[runs.length - 1];
        const nextLast: ValidationRun = {
          ...last,
          findings: last.findings.map((f) => (f.rule === rule ? { ...f, ignored: false } : f)),
        };
        set({ validationRuns: [...runs.slice(0, -1), nextLast], savedAt: new Date().toISOString() });
      },
      unresolveFinding: (rule) => {
        const runs = get().validationRuns;
        if (!runs.length) return;
        const last = runs[runs.length - 1];
        const nextLast: ValidationRun = {
          ...last,
          findings: last.findings.map((f) => (f.rule === rule ? { ...f, resolved: false } : f)),
        };
        set({ validationRuns: [...runs.slice(0, -1), nextLast], savedAt: new Date().toISOString() });
      },
      seedIfEmpty: () => {
        const s = get();
        const looksEmpty = !s.researchDesign.topic && s.literature.length === 0;
        if (!looksEmpty) return;
        set({ ...buildDemoProject(), savedAt: new Date().toISOString() });
      },
      touchSaved: () => set({ savedAt: new Date().toISOString() }),
      reset: () => set({ ...EMPTY_PROJECT }),
    }),
    { name: "aros:project-v2" },
  ),
);

export function savedAgoLabel(iso: string | null): string {
  if (!iso) return "아직 저장되지 않음";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "방금 저장됨";
  if (mins < 60) return `${mins}분 전 저장됨`;
  const hours = Math.round(mins / 60);
  return `${hours}시간 전 저장됨`;
}
