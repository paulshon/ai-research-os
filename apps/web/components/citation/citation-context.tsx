"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  RefEntry,
  loadRefDB,
  saveRefDB,
} from "@/lib/citation/apa-utils";
import {
  extractRefFromAnyFile,
  renderBibliography,
  renderReference,
  renderInText,
  CITATION_STYLES,
  type CitationFormat,
} from "@/lib/citation/citation-bridge";
import { isSupportedFile } from "@/lib/uode";

interface CitationContextValue {
  refDB: RefEntry[];
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  addRefs: (refs: RefEntry[]) => void;
  removeRef: (id: string) => void;
  markCited: (id: string, cited: boolean) => void;
  clearAll: () => void;
  loadPDFs: (files: FileList | File[]) => Promise<void>;
  loading: boolean;
  loadProgress: string;
  citedRefs: RefEntry[];
  copyAllCited: () => void;
  /** 현재 선택된 인용 스타일 (APA7/MLA9/Chicago/IEEE/Vancouver/Harvard/Nature) */
  citationStyle: CitationFormat;
  setCitationStyle: (s: CitationFormat) => void;
  /** 사용 가능한 스타일 메타데이터 */
  styles: typeof CITATION_STYLES;
  /** 선택 스타일로 참고문헌 항목 렌더 */
  formatRef: (ref: RefEntry) => string;
  /** 선택 스타일로 본문 내 인용 렌더 */
  formatInText: (ref: RefEntry, opts?: { narrative?: boolean; page?: string }) => string;
}

const CitationContext = createContext<CitationContextValue | null>(null);

export function CitationProvider({ children }: { children: React.ReactNode }) {
  const [refDB, setRefDB] = useState<RefEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [citationStyle, setCitationStyle] = useState<CitationFormat>("apa7");

  useEffect(() => {
    setRefDB(loadRefDB());
  }, []);

  const persist = useCallback((refs: RefEntry[]) => {
    setRefDB(refs);
    saveRefDB(refs);
  }, []);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((v) => !v), []);

  const addRefs = useCallback(
    (newRefs: RefEntry[]) => {
      setRefDB((prev) => {
        const merged = [...prev];
        for (const r of newRefs) {
          const dup = merged.some(
            (x) =>
              x.source === r.source ||
              (x.title &&
                r.title &&
                x.title.toLowerCase().slice(0, 30) ===
                  r.title.toLowerCase().slice(0, 30))
          );
          if (!dup) merged.push(r);
        }
        saveRefDB(merged);
        return merged;
      });
    },
    []
  );

  const removeRef = useCallback(
    (id: string) => {
      setRefDB((prev) => {
        const next = prev.filter((r) => r.id !== id);
        saveRefDB(next);
        return next;
      });
    },
    []
  );

  const markCited = useCallback((id: string, cited: boolean) => {
    setRefDB((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, cited } : r));
      saveRefDB(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const loadPDFs = useCallback(
    async (files: FileList | File[]) => {
      // PDF뿐 아니라 UODE가 지원하는 모든 문서 포맷 허용
      const fileArr = Array.from(files).filter((f) => isSupportedFile(f.name));
      if (fileArr.length === 0) return;

      setLoading(true);
      const added: RefEntry[] = [];

      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        setLoadProgress(`${i + 1} / ${fileArr.length} 처리 중: ${file.name}`);
        try {
          // UODE 통합 추출: PDF는 pdf.js, 그 외는 UODE 엔진
          const ref = await extractRefFromAnyFile(file);
          if (ref) added.push(ref);
        } catch (e: any) {
          console.error("문서 추출 오류:", e?.message || e);
        }
      }

      addRefs(added);
      setLoadProgress(`+${added.length}건 추가됨`);
      setLoading(false);
      setTimeout(() => setLoadProgress(""), 3000);
    },
    [addRefs]
  );

  const citedRefs = refDB.filter((r) => r.cited);

  const copyAllCited = useCallback(() => {
    // 선택된 인용 스타일로 전체 인용 목록 생성
    const text = renderBibliography(citedRefs, citationStyle);
    navigator.clipboard?.writeText(text).catch(() => {});
  }, [citedRefs, citationStyle]);

  const formatRef = useCallback(
    (ref: RefEntry) => renderReference(ref, citationStyle),
    [citationStyle]
  );

  const formatInText = useCallback(
    (ref: RefEntry, opts?: { narrative?: boolean; page?: string }) =>
      renderInText(ref, citationStyle, opts),
    [citationStyle]
  );

  return (
    <CitationContext.Provider
      value={{
        refDB,
        isOpen,
        openPanel,
        closePanel,
        togglePanel,
        addRefs,
        removeRef,
        markCited,
        clearAll,
        loadPDFs,
        loading,
        loadProgress,
        citedRefs,
        copyAllCited,
        citationStyle,
        setCitationStyle,
        styles: CITATION_STYLES,
        formatRef,
        formatInText,
      }}
    >
      {children}
    </CitationContext.Provider>
  );
}

export function useCitation(): CitationContextValue {
  const ctx = useContext(CitationContext);
  if (!ctx) throw new Error("useCitation must be used within CitationProvider");
  return ctx;
}
