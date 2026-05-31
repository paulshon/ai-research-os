"use client";

import { usePageSaveRegistration } from "@/hooks/use-page-save-registration";
import type { PageId } from "@/lib/project-save";

/** Headless: registers flush only. Temp save UI is in ProjectSavePanel (sidebar). */
export default function PageSaveRegistration({
  pageId,
  getData,
}: {
  pageId: PageId;
  getData: () => unknown;
}) {
  usePageSaveRegistration(pageId, getData);
  return null;
}
