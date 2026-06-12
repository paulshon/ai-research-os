import { BaseEngine } from "../BaseEngine";

/** Cognitive Engine (L3) */
export class CognitiveEngine extends BaseEngine {
  readonly key = "cognitive";
  readonly title = "Cognitive Engine";
  readonly modules = ["WorkingMemory", "Metacognition", "TransferTrainer"]; // L4 Module Layer

}
