import { BaseEngine } from "../BaseEngine";

/** Defense Engine (L3) */
export class DefenseEngine extends BaseEngine {
  readonly key = "defense";
  readonly title = "Defense Engine";
  readonly modules = ["QABank", "MockDefense", "RebuttalTrainer"]; // L4 Module Layer

}
