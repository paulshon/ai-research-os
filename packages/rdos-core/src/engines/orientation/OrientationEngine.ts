import { BaseEngine } from "../BaseEngine";

/** Orientation Engine (L3) */
export class OrientationEngine extends BaseEngine {
  readonly key = "orientation";
  readonly title = "Orientation Engine";
  readonly modules = ["Welcome", "Diagnostic", "GoalSetting"]; // L4 Module Layer

}
