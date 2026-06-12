// ═══════════════════════════════════════════
// AI Research OS — Core Domain Types
// ═══════════════════════════════════════════

// ── User & Auth ──
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  orcid_id?: string;
  role: UserRole;
  plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export type UserRole = "student" | "researcher" | "professor" | "admin";
export type SubscriptionPlan = "free" | "pro" | "team" | "university";

// ── Workspace ──
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  type: WorkspaceType;
  members: WorkspaceMember[];
  created_at: string;
  updated_at: string;
}

export type WorkspaceType = "personal" | "team" | "professor" | "student";

export interface WorkspaceMember {
  user_id: string;
  role: "owner" | "editor" | "commenter" | "viewer";
  joined_at: string;
}

// ── Project ──
export interface Project {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  thesis_type: ThesisType;
  status: ProjectStatus;
  chapters: Chapter[];
  metadata: ProjectMetadata;
  created_at: string;
  updated_at: string;
}

export type ThesisType = "quantitative" | "qualitative" | "mixed" | "experimental";
export type ProjectStatus = "draft" | "in_progress" | "review" | "completed";

export interface ProjectMetadata {
  university?: string;
  department?: string;
  advisor?: string;
  deadline?: string;
  keywords: string[];
  language: "ko" | "en";
}

// ── Chapter & Section ──
export interface Chapter {
  id: string;
  project_id: string;
  order: number;
  title: string;
  description?: string;
  sections: Section[];
  word_count: number;
  status: "empty" | "draft" | "writing" | "review" | "done";
}

export interface Section {
  id: string;
  chapter_id: string;
  order: number;
  title: string;
  content_yjs_state?: Uint8Array;
  word_count: number;
}

// ── Citation ──
export interface Citation {
  id: string;
  project_id: string;
  doi?: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  volume?: string;
  pages?: string;
  url?: string;
  format: CitationFormat;
  bibtex?: string;
  added_at: string;
}

export type CitationFormat = "apa7" | "mla9" | "chicago" | "ieee" | "vancouver";

// ── AI ──
export interface AIRequest {
  engine: AIEngine;
  system_instruction: string;
  user_text: string;
  max_tokens?: number;
  temperature?: number;
  project_context?: ProjectContext;
}

export type AIEngine =
  | "structure"
  | "chat"
  | "editor"
  | "analyzer"
  | "validation"
  | "workflow"
  | "advisor"
  | "library"
  | "critique";

export interface ProjectContext {
  thesis_type: ThesisType;
  chapter_id?: string;
  section_id?: string;
  existing_content?: string;
  research_question?: string;
}

export interface AIResponse {
  ok: boolean;
  text: string;
  engine: AIEngine;
  tokens_used?: number;
  timestamp: string;
}

// ── Collaboration ──
export interface CollaborationState {
  document_id: string;
  active_users: ActiveUser[];
  last_sync: string;
}

export interface ActiveUser {
  user_id: string;
  name: string;
  color: string;
  cursor_position?: { line: number; ch: number };
  last_active: string;
}

// ── Validation ──
export interface ValidationResult {
  id: string;
  project_id: string;
  type: ValidationType;
  severity: "error" | "warning" | "info";
  message: string;
  chapter_id?: string;
  section_id?: string;
  suggestion?: string;
}

export type ValidationType =
  | "logic"
  | "methodology"
  | "citation"
  | "structure"
  | "tone"
  | "hallucination"
  | "plagiarism";

// ── Workflow ──
export interface WorkflowTask {
  id: string;
  project_id: string;
  title: string;
  phase: WorkflowPhase;
  status: "pending" | "in_progress" | "done" | "blocked";
  assigned_to?: string;
  due_date?: string;
  order: number;
}

export type WorkflowPhase =
  | "planning"
  | "literature_review"
  | "methodology"
  | "data_collection"
  | "analysis"
  | "writing"
  | "revision"
  | "submission";

// ── Critique / Annotation ──
export interface Annotation {
  id: string;
  document_id: string;
  paragraph_index: number;
  type: "logic" | "methodology" | "structure" | "grammar" | "suggestion" | "question";
  content: string;
  status: "pending" | "approved" | "rejected" | "resolved";
  author_id: string;
  created_at: string;
}

// ── Settings ──
export interface UserSettings {
  gemini_api_key?: string;
  gemini_model: string;
  language: "ko" | "en";
  theme: "dark" | "light" | "system";
  editor_font_size: number;
  auto_save: boolean;
  local_storage_path?: string;
}
