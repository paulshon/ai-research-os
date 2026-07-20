"use client";

/**
 * TiptapEditor — Tiptap + Yjs CRDT 에디터 래퍼
 *
 * 원본 index.html의 textarea를 Tiptap 기반 리치 에디터로 교체.
 * Yjs를 통해 실시간 협업을 지원합니다.
 *
 * 의존성:
 * - @tiptap/react, @tiptap/starter-kit
 * - @tiptap/extension-collaboration (Yjs 통합)
 * - y-prosemirror
 *
 * 실제 Tiptap 초기화는 editor-core 패키지의 getEditorConfig()를 사용합니다.
 */

interface TiptapEditorProps {
  sectionId: string;
  documentId: string;
  readOnly?: boolean;
  onWordCountChange?: (count: number) => void;
}

export default function TiptapEditor({
  sectionId,
  documentId,
  readOnly = false,
  onWordCountChange,
}: TiptapEditorProps) {
  // TODO: Tiptap + Yjs 초기화
  // const ydoc = new Y.Doc();
  // const provider = new HocuspocusProvider({ url: getRealtimeUrl(documentId), name: documentId, document: ydoc });
  // const editor = useEditor(getEditorConfig({ ydoc, sectionId, readOnly }));

  return (
    <div className="prose prose-invert max-w-none">
      <div className="min-h-[400px] px-2 py-4 text-[14px] leading-[1.8] text-white/70 focus:outline-none">
        {/* Tiptap editor will render here */}
        <p className="text-white/20 text-center mt-20">
          에디터가 이 영역에 렌더링됩니다.
          <br />
          <span className="text-[12px] font-['JetBrains_Mono',monospace]">
            section: {sectionId} · doc: {documentId}
          </span>
        </p>
      </div>
    </div>
  );
}
