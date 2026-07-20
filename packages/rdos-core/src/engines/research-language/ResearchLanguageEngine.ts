import { BaseEngine } from "../BaseEngine";

/** Research Language Engine (L3) */
export class ResearchLanguageEngine extends BaseEngine {
  readonly key = "research-language";
  readonly title = "Research Language Engine";
  readonly modules = ["ConceptDictionary", "ConceptExplorer", "ConceptQuiz", "ConceptSimulation", "ConceptChallenge", "ConceptMastery"]; // L4 Module Layer

  /** 개념 학습 완료 → 설계서의 전체 파이프라인을 트리거한다. */
  async masterConcept(userId: string, nodeId: string) {
    return this.emit(userId, "language.concept.mastered", {
      nodeId,
      gain: 5,                    // Knowledge: 노드 숙련 +5
      competency: "researchLiteracy", // Competency: 연구 리터러시 ↑
      xp: 20,                     // Motivation: XP +20
    });
  }
}
