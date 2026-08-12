import { BaseEngine } from "../BaseEngine";

/** Research Motivation Engine (L3) */
export class ResearchMotivationEngine extends BaseEngine {
  readonly key = "research-motivation";
  readonly title = "Research Motivation Engine";
  readonly modules = ["WhyResearch", "MeaningMap", "Commitment"]; // L4 Module Layer

}
