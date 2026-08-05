"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 연구준비자(RDOS) 트랙 전용 스토어.
 * 연구자 프로젝트 데이터와 섞지 않는다. 두 트랙은 계속 분리한다.
 * 유일한 연결점: 인증 완료 시 profile.certifiedAt 이 설정되고 연구자 트랙 권한이 열린다.
 */
export type LearnerState = {
  level: number;
  courseProgress: Record<string, number>;
  readingSessions: number;
  writingSubmissions: number;
  apaAttempts: number;
  vocabulary: { term: string; score: number; lastSeen: string }[];
  certificationRequirements: { id: string; label: string; done: boolean; minutes: number }[];
  certifiedAt: string | null;
  streakDays: number;
  heatmap: number[];
  /** 세션마다 AI가 지적한 개선점 개수 — 글쓰기 훈련이 시간에 따라 나아지는지 추적한다. */
  writingFindings: number[];
  setLevel: (n: number) => void;
  setCourseProgress: (id: string, pct: number) => void;
  addVocab: (term: string) => void;
  reviewVocab: (term: string, delta: number) => void;
  toggleRequirement: (id: string) => void;
  recordReadingSession: () => void;
  recordWritingSubmission: (findings: number) => void;
  recordApaAttempt: () => void;
};

const DEFAULT_REQS = [
  { id: "basics", label: "연구 기초 수료", done: true, minutes: 0 },
  { id: "design", label: "연구설계 기초 실습 제출", done: false, minutes: 40 },
  { id: "method", label: "연구방법론 판단 연습 통과", done: false, minutes: 35 },
  { id: "reading", label: "논문 읽기 훈련 5회", done: false, minutes: 90 },
  { id: "writing", label: "학술 글쓰기 훈련 7회", done: false, minutes: 120 },
  { id: "apa", label: "APA 변환 연습 통과", done: false, minutes: 45 },
];

export const useLearnerStore = create<LearnerState>()(
  persist(
    (set, get) => ({
      level: 3,
      courseProgress: { basics: 100, design: 62, method: 28, reading: 40, writing: 35, apa: 20, structure: 15 },
      readingSessions: 3,
      writingSubmissions: 4,
      apaAttempts: 6,
      vocabulary: [],
      certificationRequirements: DEFAULT_REQS,
      certifiedAt: null,
      streakDays: 12,
      heatmap: Array.from({ length: 28 }, (_, i) => (i % 5 === 0 ? 0 : ((i * 3) % 4) + 1)),
      writingFindings: [],
      setLevel: (n) => set({ level: n }),
      setCourseProgress: (id, pct) =>
        set({ courseProgress: { ...get().courseProgress, [id]: Math.max(0, Math.min(100, pct)) } }),
      addVocab: (term) => {
        if (get().vocabulary.some((v) => v.term === term)) return;
        set({
          vocabulary: [
            ...get().vocabulary,
            { term, score: 0, lastSeen: new Date().toISOString() },
          ],
        });
      },
      reviewVocab: (term, delta) =>
        set({
          vocabulary: get().vocabulary.map((v) =>
            v.term === term
              ? { ...v, score: Math.max(0, Math.min(100, v.score + delta)), lastSeen: new Date().toISOString() }
              : v,
          ),
        }),
      toggleRequirement: (id) =>
        set({
          certificationRequirements: get().certificationRequirements.map((r) =>
            r.id === id ? { ...r, done: !r.done } : r,
          ),
        }),
      recordReadingSession: () => set({ readingSessions: get().readingSessions + 1 }),
      recordWritingSubmission: (findings) =>
        set({
          writingSubmissions: get().writingSubmissions + 1,
          writingFindings: [...get().writingFindings, findings].slice(-12),
        }),
      recordApaAttempt: () => set({ apaAttempts: get().apaAttempts + 1 }),
    }),
    { name: "aros:learner-v1" },
  ),
);
