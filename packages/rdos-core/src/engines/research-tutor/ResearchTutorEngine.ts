import { BaseEngine } from "../BaseEngine";

/** Research Tutor Engine (L3) */
export class ResearchTutorEngine extends BaseEngine {
  readonly key = "research-tutor";
  readonly title = "Research Tutor Engine";
  readonly modules = ["SocraticDialog", "WorkedExamples", "FeedbackLoop"]; // L4 Module Layer

}
