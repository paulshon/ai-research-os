import RdosKnowledgeView from "@/components/rdos/rdos-knowledge-view";
import {
  KNOWLEDGE_CHAPTERS, KNOWLEDGE_TERMS, KNOWLEDGE_OBJECTIVES, KNOWLEDGE_MODULES,
} from "@/lib/rdos/knowledge-core";

export const dynamic = "force-dynamic";

/* RDOS L0 — 지식 코어. 학습목표·학습모듈(12개 도메인) + 논문 8개 장 + 31개 연구용어. */
export default function RdosKnowledgePage() {
  return (
    <RdosKnowledgeView
      chapters={KNOWLEDGE_CHAPTERS}
      terms={KNOWLEDGE_TERMS}
      objectives={KNOWLEDGE_OBJECTIVES}
      modules={KNOWLEDGE_MODULES}
    />
  );
}
