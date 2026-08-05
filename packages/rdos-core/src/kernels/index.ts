// L2 — Kernel Layer barrel
export { IdentityKernel } from "./identity";
export { KnowledgeKernel } from "./knowledge";
export { CompetencyKernel } from "./competency";
export { QuestKernel } from "./quest";
export { MotivationKernel } from "./motivation";
export { AnalyticsKernel } from "./analytics";
export { AlignmentKernel } from "./alignment";
export * from "./types";
export { BaseKernel } from "./BaseKernel";

import { IdentityKernel, KnowledgeKernel, CompetencyKernel, QuestKernel, MotivationKernel, AnalyticsKernel, AlignmentKernel } from "./_imports";
import type { Kernel } from "./types";

export function createKernels(): Kernel[] {
  return [new IdentityKernel(), new KnowledgeKernel(), new CompetencyKernel(), new QuestKernel(), new MotivationKernel(), new AnalyticsKernel(), new AlignmentKernel()];
}
