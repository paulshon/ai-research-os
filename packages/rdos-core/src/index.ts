// AI Research OS v64 — 패키지 진입점
export { ResearchOS, EventBus } from "./os";
export { createEngines } from "./engines";
export { MultiAgentOrchestrator } from "./agents";
export { createApp } from "./api/handlers";
export { API_ROUTES } from "./api/routes";
export { KNOWLEDGE_MAP } from "./knowledge/knowledge-map";
export { GROWTH_LEVELS, levelForXp } from "./growth/levels";
export { learningAnalytics } from "./analytics";
export { createKernels } from "./kernels";

// --- Dual Platform (Track A: RDOS / Track B: AI-Research-OS) ---
export * from "./membership";
export * from "./auth";
export * from "./platform";

export { deriveRdosState, RDOS_MENU_MAP } from "./derive";
export type { RdosLearnerState, RdosMission } from "./derive";
