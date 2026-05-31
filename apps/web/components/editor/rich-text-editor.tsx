"use client";

/* ════════════════════════════════════════════════════════════
   v25: RichTextEditor — Issue 1/5 (Writing 페이지)
   - 단순 <textarea> → 서식 지원 리치 텍스트 에디터로 교체
   - editor-core 패키지의 EDITOR_DEFAULTS를 사용 (패키지 분리 목적 달성)
   - 제목(H1/H2/H3), 굵게/기울임/밑줄, 목록, 인용구, 본문 서식 툴바
   - value(HTML)/onChange 인터페이스 — 기존 content 상태와 호환
   - insertHTML로 AI 생성 텍스트 삽입 가능 (ref 핸들 노출)
═══════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Icon } from "@/components/ui/icon";
import { EDITOR_DEFAULTS } from "@ai-research-os/editor-core";

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
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

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder, minHeight = 500 }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);

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

    const exec = useCallback(
      (action: ToolbarAction) => {
        editorRef.current?.focus();
        if (action.kind === "cmd") {
          document.execCommand(action.command, false, action.value);
        } else {
          // 블록 포맷 변경
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
        // 일반 텍스트를 단락으로 삽입
        const html = text
          .split(/\n{2,}/)
          .map((para) => `<p>${para.replace(/\n/g, "<br>").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
          .join("");
        document.execCommand("insertHTML", false, html);
        emitChange();
      },
      focus: () => editorRef.current?.focus(),
    }));

    return (
      <div className="rich-text-editor">
        {/* 툴바 */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 mb-4 pb-2 border-b border-white/[0.06] bg-[var(--surface,#0f1117)]/80 backdrop-blur">
          {TOOLBAR.map((a, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                exec(a);
              }}
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
          data-placeholder={placeholder || "여기에 논문을 작성하세요..."}
          className="rte-content w-full bg-transparent text-white/80 focus:outline-none font-nanum-myeongjo"
          style={{
            minHeight,
            fontSize: EDITOR_DEFAULTS.fontSize,
            lineHeight: EDITOR_DEFAULTS.lineHeight,
          }}
        />

        <style jsx global>{`
          .rte-content:empty:before {
            content: attr(data-placeholder);
            color: rgba(255, 255, 255, 0.15);
            pointer-events: none;
          }
          .rte-content h1 {
            font-size: 1.6em;
            font-weight: 700;
            margin: 0.6em 0 0.3em;
            color: #e8eaf0;
          }
          .rte-content h2 {
            font-size: 1.35em;
            font-weight: 700;
            margin: 0.6em 0 0.3em;
            color: #e8eaf0;
          }
          .rte-content h3 {
            font-size: 1.15em;
            font-weight: 600;
            margin: 0.5em 0 0.25em;
            color: #dfe2ea;
          }
          .rte-content p {
            margin: 0.5em 0;
          }
          .rte-content ul,
          .rte-content ol {
            margin: 0.5em 0;
            padding-left: 1.5em;
          }
          .rte-content ul {
            list-style: disc;
          }
          .rte-content ol {
            list-style: decimal;
          }
          .rte-content blockquote {
            border-left: 3px solid rgba(108, 140, 255, 0.5);
            padding-left: 1em;
            margin: 0.6em 0;
            color: rgba(255, 255, 255, 0.6);
            font-style: italic;
          }
          .rte-content a {
            color: #a78bfa;
            text-decoration: underline;
          }
        `}</style>
      </div>
    );
  }
);

export default RichTextEditor;
