import { BaseEngine } from "../BaseEngine";

/** Research Design Studio (L3) */
export class ResearchDesignStudio extends BaseEngine {
  readonly key = "research-design-studio";
  readonly title = "Research Design Studio";
  readonly modules = ["DesignCanvas", "VariableMapper", "SamplingPlanner", "ValidityChecker"]; // L4 Module Layer

}
