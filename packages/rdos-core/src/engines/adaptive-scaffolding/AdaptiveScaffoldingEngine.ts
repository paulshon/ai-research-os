import { BaseEngine } from "../BaseEngine";

/** Adaptive Scaffolding Engine (L3) */
export class AdaptiveScaffoldingEngine extends BaseEngine {
  readonly key = "adaptive-scaffolding";
  readonly title = "Adaptive Scaffolding Engine";
  readonly modules = ["HintLadder", "ZPDTracker", "FadingSupport"]; // L4 Module Layer

}
