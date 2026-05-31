"use client";

import { useEffect } from "react";
import { loadPageDraft, type PageId } from "@/lib/project-save";

/**
 * Load page draft on mount, after .aros load, or reset to defaults on project reset.
 */
export function usePagePersistence(
  pageId: PageId,
  onLoad: (data: unknown) => void,
  onReset?: () => void
) {
  useEffect(() => {
    const loadFromStorage = () => {
      const draft = loadPageDraft(pageId);
      if (draft) onLoad(draft);
    };

    loadFromStorage();

    const onProjectLoaded = () => loadFromStorage();
    const onProjectReset = () => onReset?.();

    window.addEventListener("aros:project-loaded", onProjectLoaded);
    window.addEventListener("aros:project-reset", onProjectReset);
    return () => {
      window.removeEventListener("aros:project-loaded", onProjectLoaded);
      window.removeEventListener("aros:project-reset", onProjectReset);
    };
  }, [pageId, onLoad, onReset]);
}
