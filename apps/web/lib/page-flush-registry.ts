import type { PageId } from "@/lib/project-save";

type FlushHandler = () => void;

const handlers = new Map<PageId, FlushHandler>();

/** Register a handler that persists the current page React state to localStorage. */
export function registerPageFlush(pageId: PageId, flush: FlushHandler): () => void {
  handlers.set(pageId, flush);
  return () => {
    if (handlers.get(pageId) === flush) handlers.delete(pageId);
  };
}

export function flushPage(pageId: PageId): boolean {
  const fn = handlers.get(pageId);
  if (!fn) return false;
  fn();
  return true;
}

/** Flush every mounted engine page before building a project snapshot. */
export function flushAllRegisteredPages(): void {
  handlers.forEach((fn) => fn());
}
