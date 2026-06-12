"use client";

/* ════════════════════════════════════════════════════════════
   RichTextEditor — Writing 페이지 리치 텍스트 에디터
   - 제목/굵게/기울임/밑줄/목록/인용 + 본문 서식 툴바
   - insertHTML로 이미지·표·차트 삽입
   - v47: 삽입한 그림/표 선택 시 "미디어 툴바" 표시
       · 크기: 작게/보통/크게(40/70/100%) + 이미지 코너 드래그 리사이즈
       · 정렬: 왼쪽/가운데/오른쪽 (문단 배치)
       · 줄/문단: 인라인(줄 안) ↔ 블록(문단) 전환
       · 삭제
═══════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { Icon } from "@/components/ui/icon";
import { EDITOR_DEFAULTS } from "@ai-research-os/editor-core";

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  insertHTML: (html: string) => void;
  focus: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type ToolbarAction =
  | { kind: "cmd"; command: string; value?: string; icon: string; title: string }
  | { kind: "format"; block: string; icon: string; title: string; label?: string };

const TOOLBAR: ToolbarAction[] = [
  { kind: "format", block: "h1", icon: "note", title: "제목 1", label: "H1" },
  { kind: "format", block: "h2", icon: "note", title: "제목 2", label: "H2" },
  { kind: "format", block: "h3", icon: "note", title: "제목 3", label: "H3" },
  { kind: "format", block: "p", icon: "file", title: "본문", label: "본문" },
  { kind: "cmd", command: "bold", icon: "pencil", title: "굵게" },
  { kind: "cmd", command: "italic", icon: "pencil", title: "기울임" },
  { kind: "cmd", command: "underline", icon: "pencil", title: "밑줄" },
  { kind: "cmd", command: "insertUnorderedList", icon: "files", title: "글머리 목록" },
  { kind: "cmd", command: "insertOrderedList", icon: "files", title: "번호 목록" },
  { kind: "format", block: "blockquote", icon: "files", title: "인용구", label: "“ ”" },
];

type Rect = { top: number; left: number; width: number; height: number };

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder, minHeight = 500 }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);

    // 외부 value 변경 시 DOM 동기화 (포커스 중이 아닐 때만)
    useEffect(() => {
      const el = editorRef.current;
      if (el && el.innerHTML !== value && document.activeElement !== el) {
        el.innerHTML = value || "";
      }
    }, [value]);

    const emitChange = useCallback(() => {
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }, [onChange]);

    // ── 선택된 미디어 위치 계산 ──
    const recompute = useCallback(() => {
      const el = selectedEl;
      if (!el || !el.isConnected) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, [selectedEl]);

    useEffect(() => {
      recompute();
      if (!selectedEl) return;
      const onScrollResize = () => recompute();
      window.addEventListener("scroll", onScrollResize, true);
      window.addEventListener("resize", onScrollResize);
      return () => {
        window.removeEventListener("scroll", onScrollResize, true);
        window.removeEventListener("resize", onScrollResize);
      };
    }, [selectedEl, recompute]);

    // 선택 표시 클래스 토글
    useEffect(() => {
      if (!selectedEl) return;
      selectedEl.classList.add("rte-selected");
      return () => selectedEl.classList.remove("rte-selected");
    }, [selectedEl]);

    // 에디터 클릭 → 이미지/표 선택
    const handleEditorClick = useCallback((e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const media = target.closest("img, table") as HTMLElement | null;
      if (media && editorRef.current?.contains(media)) {
        setSelectedEl(media);
      } else {
        setSelectedEl(null);
      }
    }, []);

    // 에디터 바깥 클릭 시 해제
    useEffect(() => {
      const onDocDown = (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        if (t.closest(".rte-media-toolbar") || t.closest(".rte-resize-handle")) return;
        if (t.closest("img, table") && editorRef.current?.contains(t)) return;
        setSelectedEl(null);
      };
      document.addEventListener("mousedown", onDocDown);
      return () => document.removeEventListener("mousedown", onDocDown);
    }, []);

    // ── 미디어 스타일 조작 ──
    const applyWidth = (pct: number) => {
      if (!selectedEl) return;
      selectedEl.style.width = pct + "%";
      if (selectedEl.tagName === "IMG") selectedEl.style.height = "auto";
      emitChange(); recompute();
    };
    const applyAlign = (align: "left" | "center" | "right") => {
      if (!selectedEl) return;
      const el = selectedEl;
      el.style.float = "none";
      el.style.marginLeft = "";
      el.style.marginRight = "";
      el.style.display = el.tagName === "IMG" ? "block" : "table";
      if (align === "center") { el.style.marginLeft = "auto"; el.style.marginRight = "auto"; }
      else if (align === "left") { el.style.float = "left"; el.style.marginRight = "16px"; el.style.marginBottom = "8px"; }
      else if (align === "right") { el.style.float = "right"; el.style.marginLeft = "16px"; el.style.marginBottom = "8px"; }
      emitChange(); recompute();
    };
    const toggleInline = () => {
      if (!selectedEl) return;
      const el = selectedEl;
      const isInline = el.style.display === "inline" || el.style.display === "inline-block";
      if (isInline) {
        el.style.display = el.tagName === "IMG" ? "block" : "table";
        el.style.verticalAlign = "";
      } else {
        el.style.display = "inline-block";
        el.style.float = "none";
        el.style.verticalAlign = "middle";
        el.style.marginLeft = "4px";
        el.style.marginRight = "4px";
      }
      emitChange(); recompute();
    };
    const removeEl = () => {
      if (!selectedEl) return;
      selectedEl.remove();
      setSelectedEl(null);
      emitChange();
    };

    // ── 이미지 코너 드래그 리사이즈 (v48: window 리스너로 안정화) ──
    const onHandleDown = (e: React.PointerEvent) => {
      if (!selectedEl) return;
      e.preventDefault();
      e.stopPropagation();
      const el = selectedEl;
      const startX = e.clientX;
      const startW = el.getBoundingClientRect().width;
      const parentW = el.parentElement?.getBoundingClientRect().width || startW || 1;
      const move = (ev: PointerEvent) => {
        const newW = Math.max(40, startW + (ev.clientX - startX));
        const pct = Math.min(100, Math.max(8, Math.round((newW / parentW) * 100)));
        el.style.width = pct + "%";
        if (el.tagName === "IMG") el.style.height = "auto";
        recompute();
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        emitChange();
        recompute();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

    const exec = useCallback(
      (action: ToolbarAction) => {
        editorRef.current?.focus();
        if (action.kind === "cmd") {
          document.execCommand(action.command, false, action.value);
        } else {
          const tag = action.block === "p" ? "P" : action.block.toUpperCase();
          document.execCommand("formatBlock", false, tag);
        }
        emitChange();
      },
      [emitChange]
    );

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const html = text
          .split(/\n{2,}/)
          .map((para) => `<p>${para.replace(/\n/g, "<br>").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
          .join("");
        document.execCommand("insertHTML", false, html);
        emitChange();
      },
      insertHTML: (html: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        const inEditor = sel && sel.rangeCount > 0 && el.contains(sel.anchorNode);
        if (inEditor) {
          document.execCommand("insertHTML", false, html);
        } else {
          el.innerHTML = el.innerHTML + html;
        }
        emitChange();
      },
      focus: () => editorRef.current?.focus(),
    }));

    const isImg = selectedEl?.tagName === "IMG";

    return (
      <div className="rich-text-editor">
        {/* 툴바 */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 mb-4 pb-2 border-b border-white/[0.06] bg-[var(--surface,#0f1117)]/80 backdrop-blur">
          {TOOLBAR.map((a, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); exec(a); }}
              title={a.title}
              className="px-2 py-1 rounded-md text-[11px] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all min-w-[28px] flex items-center justify-center"
            >
              {"label" in a && a.label ? (
                <span className="font-medium">{a.label}</span>
              ) : a.kind === "cmd" && a.command === "bold" ? (
                <span className="font-bold">B</span>
              ) : a.kind === "cmd" && a.command === "italic" ? (
                <span className="italic font-serif">I</span>
              ) : a.kind === "cmd" && a.command === "underline" ? (
                <span className="underline">U</span>
              ) : a.kind === "cmd" && a.command === "insertUnorderedList" ? (
                <span>•≡</span>
              ) : a.kind === "cmd" && a.command === "insertOrderedList" ? (
                <span>1.≡</span>
              ) : (
                <Icon name={a.icon} size={13} />
              )}
            </button>
          ))}
        </div>

        {/* 편집 영역 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          onClick={handleEditorClick}
          data-placeholder={placeholder || "여기에 논문을 작성하세요..."}
          className="rte-content w-full bg-transparent text-white/80 focus:outline-none font-nanum-myeongjo"
          style={{ minHeight, fontSize: EDITOR_DEFAULTS.fontSize, lineHeight: EDITOR_DEFAULTS.lineHeight }}
        />

        {/* ── 미디어 툴바 (선택된 그림/표 위에 표시) ── */}
        {selectedEl && rect && (
          <div
            className="rte-media-toolbar fixed z-[9999] flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-[#1a1e2a] border border-white/[0.12] shadow-2xl text-[12px]"
            style={{
              top: Math.max(8, rect.top - 44),
              left: Math.min(Math.max(8, rect.left), (typeof window !== "undefined" ? window.innerWidth : 1200) - 360),
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="px-1.5 text-white/35">{isImg ? "그림" : "표"}</span>
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button onClick={() => applyWidth(40)} className="px-2 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="작게">작게</button>
            <button onClick={() => applyWidth(70)} className="px-2 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="보통">보통</button>
            <button onClick={() => applyWidth(100)} className="px-2 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="크게">크게</button>
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button onClick={() => applyAlign("left")} className="px-1.5 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="왼쪽 정렬"><Icon name="alignLeft" size={14} /></button>
            <button onClick={() => applyAlign("center")} className="px-1.5 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="가운데 정렬"><Icon name="alignCenter" size={14} /></button>
            <button onClick={() => applyAlign("right")} className="px-1.5 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="오른쪽 정렬"><Icon name="alignRight" size={14} /></button>
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button onClick={toggleInline} className="px-2 py-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.07]" title="줄 안/문단 전환">줄/문단</button>
            <button onClick={removeEl} className="px-1.5 py-1 rounded-md text-[#ff7066]/80 hover:text-[#ff7066] hover:bg-[#ff7066]/10" title="삭제"><Icon name="trash" size={14} /></button>
          </div>
        )}

        {/* ── 이미지 코너 리사이즈 핸들 ── */}
        {isImg && rect && (
          <div
            className="rte-resize-handle fixed z-[9999] w-4 h-4 rounded-full bg-[#6c8cff] border-2 border-white cursor-nwse-resize shadow-lg hover:scale-110 transition-transform"
            style={{ top: rect.top + rect.height - 8, left: rect.left + rect.width - 8, touchAction: "none" }}
            onPointerDown={onHandleDown}
            title="드래그하여 크기 조절"
          />
        )}

        <style jsx global>{`
          .rte-content:empty:before {
            content: attr(data-placeholder);
            color: rgba(255, 255, 255, 0.15);
            pointer-events: none;
          }
          .rte-content h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0 0.3em; color: #e8eaf0; }
          .rte-content h2 { font-size: 1.35em; font-weight: 700; margin: 0.6em 0 0.3em; color: #e8eaf0; }
          .rte-content h3 { font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.25em; color: #dfe2ea; }
          .rte-content p { margin: 0.5em 0; }
          .rte-content ul, .rte-content ol { margin: 0.5em 0; padding-left: 1.5em; }
          .rte-content ul { list-style: disc; }
          .rte-content ol { list-style: decimal; }
          .rte-content blockquote {
            border-left: 3px solid rgba(108, 140, 255, 0.5);
            padding-left: 1em; margin: 0.6em 0; color: rgba(255, 255, 255, 0.6); font-style: italic;
          }
          .rte-content a { color: #a78bfa; text-decoration: underline; }
          /* v47: 삽입 미디어 기본 스타일 + 선택 표시 */
          .rte-content img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0.6em auto; cursor: pointer; }
          .rte-content table { max-width: 100%; border-collapse: collapse; margin: 0.6em auto; cursor: pointer; }
          .rte-content img.rte-selected, .rte-content table.rte-selected {
            outline: 2px solid #6c8cff; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(108,140,255,0.18);
          }
        `}</style>
      </div>
    );
  }
);

export default RichTextEditor;
