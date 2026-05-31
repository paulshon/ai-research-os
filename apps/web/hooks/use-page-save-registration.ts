"use client";

import { useEffect } from "react";
import { savePageDraft, type PageId } from "@/lib/project-save";
import { registerPageFlush } from "@/lib/page-flush-registry";

/**
 * Registers page state flush for project-wide temp/disk save.
 * UI: use sidebar ProjectSavePanel "임시저장" only (no per-page buttons).
 */
export function usePageSaveRegistration(pageId: PageId, getData: () => unknown) {
  useEffect(() => {
    const flush = () => savePageDraft(pageId, getData());
    const unregister = registerPageFlush(pageId, flush);
    return () => {
      flush();
      unregister();
    };
  }, [pageId, getData]);
}
