/**
 * Collaboration Core — Yjs CRDT 문서 공유 유틸리티
 *
 * 원본 ai-research-studio는 단일 사용자 앱이었으나,
 * 새 아키텍처에서는 Yjs + Hocuspocus 기반 실시간 협업을 지원합니다.
 */

import * as Y from "yjs";

/**
 * 연구 문서용 Yjs 문서 초기화
 * 각 섹션이 독립적인 Y.XmlFragment로 관리됨
 */
export function initResearchDoc(ydoc: Y.Doc): void {
  // 문서 메타데이터
  const meta = ydoc.getMap("meta");
  if (!meta.has("title")) {
    meta.set("title", "");
    meta.set("createdAt", new Date().toISOString());
    meta.set("updatedAt", new Date().toISOString());
  }

  // 챕터 순서 관리
  if (!ydoc.getArray("chapterOrder").length) {
    ydoc.getArray("chapterOrder");
  }
}

/**
 * 특정 섹션의 Tiptap용 XmlFragment 가져오기
 */
export function getSectionFragment(
  ydoc: Y.Doc,
  sectionId: string
): Y.XmlFragment {
  return ydoc.getXmlFragment(`section-${sectionId}`);
}

/**
 * 커서 위치를 표시하기 위한 awareness 정보
 */
export interface AwarenessUser {
  name: string;
  color: string;
  avatarUrl?: string;
  cursor?: {
    sectionId: string;
    position: number;
  };
}

/**
 * 협업 세션에 사용할 사용자 색상 생성 (해시 기반)
 */
export function getUserColor(userId: string): string {
  const COLORS = [
    "#6c8cff", "#3ecfb2", "#a78bfa", "#e8b84b",
    "#ff7066", "#ec4899", "#5ebd7c", "#f472b6",
    "#06b6d4", "#f59e0b", "#8b5cf6", "#14b8a6",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Yjs 문서 상태를 base64 인코딩/디코딩
 */
export function encodeDocState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

export function applyDocState(ydoc: Y.Doc, state: Uint8Array): void {
  Y.applyUpdate(ydoc, state);
}

/**
 * 두 Yjs 문서의 변경사항 머지
 */
export function mergeUpdates(updates: Uint8Array[]): Uint8Array {
  return Y.mergeUpdates(updates);
}

/**
 * Hocuspocus 연결 URL 생성
 */
export function getRealtimeUrl(documentId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.REALTIME_URL ||
    "ws://localhost:1234";
  return `${baseUrl}/${documentId}`;
}
