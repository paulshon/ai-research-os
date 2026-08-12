import { flushAllRegisteredPages } from "@/lib/page-flush-registry";
import { resetProjectStorage } from "@/lib/project-save";

/** Flush mounted pages and clear all stored project/page data. */
export function performProjectReset(defaultName: string): void {
  flushAllRegisteredPages();
  resetProjectStorage(defaultName);
}
