import { BaseEngine } from "../BaseEngine";

/** Research Foundation Engine (L3) */
export class ResearchFoundationEngine extends BaseEngine {
  readonly key = "research-foundation";
  readonly title = "Research Foundation Engine";
  readonly modules = ["ProblemBuilder", "PurposeBuilder", "QuestionBuilder", "HypothesisBuilder"]; // L4 Module Layer

  /** 연구문제/목적/질문/가설을 정렬 체인에 등록한다. */
  async setChain(userId: string, part: "problem"|"purpose"|"question"|"hypothesis", value: string) {
    return this.emit(userId, "alignment.set", { [part]: value, competency: "researchLiteracy", gain: 3 });
  }
}
