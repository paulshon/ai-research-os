/**
 * Centralized project save keys — prevents localStorage collisions
 * across pages and legacy keys (e.g. gemini-api-key).
 */

import { isCritiqueDraft, slimCritiqueDraftForStorage, minimalCritiqueDraftForStorage } from "@/lib/critique-draft";
import { getCritiquePdfMemory, setCritiquePdfMemory, saveCritiquePdfBase64 } from "@/lib/critique-pdf-store";

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
  if (pageId === "critique" && isCritiqueDraft(data) && data.pdfBase64) {
    setCritiquePdfMemory(data.pdfBase64);
    void saveCritiquePdfBase64(data.pdfBase64);
  }
  try {
    localStorage.setItem(pageStorageKey(pageId), JSON.stringify(data));
  } catch (e) {
    if (pageId === "critique" && isQuotaError(e) && isCritiqueDraft(data)) {
      /* PDF 는 IDB/메모리에 두고 LS 에는 슬림 본문만 */
      if (data.pdfBase64) {
        setCritiquePdfMemory(data.pdfBase64);
        void saveCritiquePdfBase64(data.pdfBase64);
      }
      try {
        localStorage.setItem(
          pageStorageKey(pageId),
          JSON.stringify(slimCritiqueDraftForStorage(data))
        );
        return;
      } catch (e2) {
        if (!isQuotaError(e2)) throw e2;
      }
      try {
        localStorage.setItem(
          pageStorageKey(pageId),
          JSON.stringify(minimalCritiqueDraftForStorage(data))
        );
        return;
      } catch (e3) {
        if (!isQuotaError(e3)) throw e3;
        console.warn("[aros] critique draft too large for localStorage; PDF kept in IndexedDB");
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
    try {
      localStorage.removeItem("aros:writing:linked-results");
      localStorage.removeItem("aros:method:outputs");
      void import("@/lib/critique-pdf-store").then((m) => m.clearCritiquePdfStore());
    } catch {
      /* ignore */
    }
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
  /* ove-4: 프로젝트 저장 시 PDF 동봉 — LS 에서 빠졌어도 메모리 캐시로 복구 */
  const critique = pages.critique;
  if (isCritiqueDraft(critique) && !critique.pdfBase64) {
    const pdf = getCritiquePdfMemory();
    if (pdf) pages.critique = { ...critique, pdfBase64: pdf };
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
        if (id === "critique" && isCritiqueDraft(data) && data.pdfBase64) {
          setCritiquePdfMemory(data.pdfBase64);
          void saveCritiquePdfBase64(data.pdfBase64);
        }
      }
    }
  }
  localStorage.setItem(LS_KEYS.projectTemp, JSON.stringify(snapshot));
}
