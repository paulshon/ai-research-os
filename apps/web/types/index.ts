/**
 * Web App Types — 프론트엔드 전용 타입 확장
 * shared-types에서 기본 도메인 타입을 가져오고,
 * 프론트엔드 특화 타입을 추가로 정의합니다.
 */

export type {
  User,
  UserRole,
  SubscriptionPlan,
  Workspace,
  WorkspaceType,
  WorkspaceMember,
  Project,
  ThesisType,
  ProjectStatus,
  ProjectMetadata,
  Chapter,
  Section,
  Citation,
  CitationFormat,
  AIRequest,
  AIEngine,
  AIResponse,
  CollaborationState,
  ActiveUser,
  ValidationResult,
  ValidationType,
  WorkflowTask,
  WorkflowPhase,
  Annotation,
  UserSettings,
} from "@ai-research-os/shared-types";

/* ── API Response Wrappers ── */

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

/* ── Navigation ── */

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
}

/* ── Editor State ── */

export interface EditorState {
  projectId: string;
  activeChapterId: string | null;
  activeSectionId: string | null;
  isDirty: boolean;
  lastSavedAt: string | null;
  wordCount: number;
  collaborators: Array<{
    userId: string;
    name: string;
    color: string;
    cursor?: { line: number; ch: number };
  }>;
}

/* ── AI Panel State ── */

export type AIPanelTab = "chat" | "validation" | "structure" | "critique";

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  engine: string;
  timestamp: string;
}

/* ── Form Types ── */

export interface ProjectFormData {
  title: string;
  description: string;
  thesis_type: string;
  university: string;
  department: string;
  advisor: string;
  deadline: string;
  keywords: string[];
  language: string;
}
