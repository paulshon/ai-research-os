/**
 * Centralized project save keys — prevents localStorage collisions
 * across pages and legacy keys (e.g. gemini-api-key).
 */

import { isCritiqueDraft, slimCritiqueDraftForStorage, minimalCritiqueDraftForStorage } from "@/lib/critique-draft";

export const PROJECT_FILE_EXT = ".aros";
export const PROJECT_MIME = "application/vnd.ai-research-os+json";

export const LS_KEYS = {
  projectName: "aros:project:name",
  projectTemp: "aros:project:temp",
  projectFileName: "aros:project:fileName",
  pagePrefix: "aros:page:",
} as const;

export const ALL_PAGE_IDS: PageId[] = [
  "research",
  "structure",
  "method",
  "chat",
  "critique",
  "editor",
  "analyzer",
  "validation",
  "workflow",
  "advisor",
  "library",
  "literature-review",
  "literature",
  "writing",
  "dashboard",
];

export type PageId =
  | "research"
  | "structure"
  | "method"
  | "chat"
  | "critique"
  | "editor"
  | "analyzer"
  | "validation"
  | "workflow"
  | "schedule"
  | "advisor"
  | "library"
  | "literature-review"
  | "literature"
  | "writing"
  | "dashboard";

export interface ProjectSnapshot {
  version: 1;
  name: string;
  savedAt: string;
  pages: Partial<Record<PageId, unknown>>;
}

export function pageStorageKey(pageId: PageId): string {
  return `${LS_KEYS.pagePrefix}${pageId}`;
}

export function getProjectName(): string {
  if (typeof window === "undefined") return "새 프로젝트";
  return localStorage.getItem(LS_KEYS.projectName) || "새 프로젝트";
}

export function setProjectName(name: string): void {
  localStorage.setItem(LS_KEYS.projectName, name);
}

export function getProjectFileName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_KEYS.projectFileName);
}

export function setProjectFileName(fileName: string): void {
  const base = fileName.replace(/\.aros$/i, "").trim();
  if (base) localStorage.setItem(LS_KEYS.projectFileName, base);
}

export function clearProjectFileName(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEYS.projectFileName);
}

export function savePageDraft(pageId: PageId, data: unknown): void {
  try {
    localStorage.setItem(pageStorageKey(pageId), JSON.stringify(data));
  } catch (e) {
    if (pageId === "critique" && isQuotaError(e) && isCritiqueDraft(data)) {
      // 1차 폴백: 페이지 썸네일 이미지 제거 (텍스트 + 원본 PDF 유지)
      try {
        localStorage.setItem(
          pageStorageKey(pageId),
          JSON.stringify(slimCritiqueDraftForStorage(data))
        );
        return;
      } catch (e2) {
        if (!isQuotaError(e2)) throw e2;
      }
      // 2차 폴백: 원본 PDF 바이트까지 제거 (400p 대용량 PDF — 텍스트/크리틱만 보존)
      try {
        localStorage.setItem(
          pageStorageKey(pageId),
          JSON.stringify(minimalCritiqueDraftForStorage(data))
        );
        return;
      } catch (e3) {
        if (!isQuotaError(e3)) throw e3;
        // 최종: 저장 실패해도 앱은 계속 동작 (세션 메모리에는 데이터 유지)
        console.warn("[aros] critique draft too large for localStorage; skipping persist");
      }
    } else {
      throw e;
    }
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.code === 22)
  );
}

function isPlaceholderDraft(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "_tabSnapshot" in data &&
    (data as { _tabSnapshot?: boolean })._tabSnapshot === true
  );
}

export function loadPageDraft<T>(pageId: PageId): T | null {
  const raw = localStorage.getItem(pageStorageKey(pageId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T;
    if (isPlaceholderDraft(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Remove all per-page drafts and temp project cache. */
export function clearAllPageDrafts(): void {
  if (typeof window === "undefined") return;
  for (const id of ALL_PAGE_IDS) {
    localStorage.removeItem(pageStorageKey(id));
  }
  localStorage.removeItem(LS_KEYS.projectTemp);
  clearProjectFileName();
}

/** Reset entire project in storage and notify all engine pages. */
export function resetProjectStorage(defaultName = "새 프로젝트"): void {
  clearAllPageDrafts();
  setProjectName(defaultName);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aros:project-reset"));
  }
}

export function buildProjectSnapshot(
  name: string,
  extraPages?: Partial<Record<PageId, unknown>>
): ProjectSnapshot {
  const pages: Partial<Record<PageId, unknown>> = { ...extraPages };
  for (const id of ALL_PAGE_IDS) {
    const draft = loadPageDraft(id);
    if (draft !== null && !isPlaceholderDraft(draft)) pages[id] = draft;
  }
  return {
    version: 1,
    name,
    savedAt: new Date().toISOString(),
    pages,
  };
}

export function applyProjectSnapshot(snapshot: ProjectSnapshot): void {
  if (snapshot.name) setProjectName(snapshot.name);
  if (snapshot.pages) {
    for (const [id, data] of Object.entries(snapshot.pages)) {
      if (data !== undefined) {
        savePageDraft(id as PageId, data);
      }
    }
  }
  localStorage.setItem(LS_KEYS.projectTemp, JSON.stringify(snapshot));
}
