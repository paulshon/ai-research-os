import { BaseEngine } from "../BaseEngine";

/** Research Alignment Engine (L3) */
export class ResearchAlignmentEngine extends BaseEngine {
  readonly key = "research-alignment";
  readonly title = "Research Alignment Engine";
  readonly modules = ["ChainInspector", "ConflictResolver"]; // L4 Module Layer

}
