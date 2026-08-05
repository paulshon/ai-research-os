// L3 — Engine Layer barrel
import type { ResearchOS } from "../os/ResearchOS";
import { OrientationEngine } from "./orientation";
import { ResearchMotivationEngine } from "./research-motivation";
import { ResearchLanguageEngine } from "./research-language";
import { AdaptiveScaffoldingEngine } from "./adaptive-scaffolding";
import { ResearchQuestEngine } from "./research-quest";
import { HumanMeaningEngine } from "./human-meaning";
import { CognitiveEngine } from "./cognitive";
import { AcademicThinkingEngine } from "./academic-thinking";
import { ResearchFoundationEngine } from "./research-foundation";
import { ResearchTutorEngine } from "./research-tutor";
import { ResearchDesignStudio } from "./research-design-studio";
import { ResearchAlignmentEngine } from "./research-alignment";
import { AcademicWritingEngine } from "./academic-writing";
import { DefenseEngine } from "./defense";
export { OrientationEngine } from "./orientation";
export { ResearchMotivationEngine } from "./research-motivation";
export { ResearchLanguageEngine } from "./research-language";
export { AdaptiveScaffoldingEngine } from "./adaptive-scaffolding";
export { ResearchQuestEngine } from "./research-quest";
export { HumanMeaningEngine } from "./human-meaning";
export { CognitiveEngine } from "./cognitive";
export { AcademicThinkingEngine } from "./academic-thinking";
export { ResearchFoundationEngine } from "./research-foundation";
export { ResearchTutorEngine } from "./research-tutor";
export { ResearchDesignStudio } from "./research-design-studio";
export { ResearchAlignmentEngine } from "./research-alignment";
export { AcademicWritingEngine } from "./academic-writing";
export { DefenseEngine } from "./defense";

export function createEngines(os: ResearchOS) {
  return {
    "orientation": new OrientationEngine(os),
    "research-motivation": new ResearchMotivationEngine(os),
    "research-language": new ResearchLanguageEngine(os),
    "adaptive-scaffolding": new AdaptiveScaffoldingEngine(os),
    "research-quest": new ResearchQuestEngine(os),
    "human-meaning": new HumanMeaningEngine(os),
    "cognitive": new CognitiveEngine(os),
    "academic-thinking": new AcademicThinkingEngine(os),
    "research-foundation": new ResearchFoundationEngine(os),
    "research-tutor": new ResearchTutorEngine(os),
    "research-design-studio": new ResearchDesignStudio(os),
    "research-alignment": new ResearchAlignmentEngine(os),
    "academic-writing": new AcademicWritingEngine(os),
    "defense": new DefenseEngine(os),
  };
}
