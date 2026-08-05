"use client";

import { useEffect, useRef } from "react";
import { savePageDraft, type PageId } from "@/lib/project-save";
import { registerPageFlush } from "@/lib/page-flush-registry";

/**
 * v49: 페이지 작업물 자동저장 + 프로젝트 저장 연동
 * - 각 페이지의 작업 상태를 페이지 드래프트(localStorage)에 지속 저장한다.
 * - 저장 시점: ① 변경 감지 시(주기 autosave) ② 탭/앱 백그라운드 전환·새로고침·종료 시
 *   ③ 페이지 언마운트(메뉴 이동) 시.
 * - 모든 페이지가 이 훅으로 등록되므로, 사이드바의 임시저장/저장(=flushAllRegisteredPages +
 *   buildProjectSnapshot)이 항상 모든 메뉴의 최신 작업을 포함하게 된다.
 */
export function usePageSaveRegistration(pageId: PageId, getData: () => unknown) {
  // getData는 매 렌더 새 함수일 수 있으므로 ref로 최신값을 유지(effect 재실행 방지)
  const getDataRef = useRef(getData);
  getDataRef.current = getData;
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    const flush = () => {
      try {
        const data = getDataRef.current();
        savePageDraft(pageId, data);
        try { lastSavedRef.current = JSON.stringify(data); } catch { /* noop */ }
      } catch { /* noop */ }
    };

    // 변경된 경우에만 저장(불필요한 쓰기 방지)
    const autosave = () => {
      try {
        const data = getDataRef.current();
        let s = "";
        try { s = JSON.stringify(data); } catch { s = String(Date.now()); }
        if (s === lastSavedRef.current) return;
        lastSavedRef.current = s;
        savePageDraft(pageId, data);
      } catch { /* noop */ }
    };

    const unregister = registerPageFlush(pageId, flush);
    const interval = window.setInterval(autosave, 4000);

    const onPageHide = () => flush();
    const onBeforeUnload = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();        // 메뉴 이동(언마운트) 시 즉시 보존
      unregister();
    };
  }, [pageId]);
}
