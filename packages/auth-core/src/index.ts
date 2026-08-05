/**
 * Auth Core — 역할 & 권한 시스템
 * web / api / desktop 에서 공통 사용
 */

export type UserRole = "student" | "researcher" | "professor" | "admin";
export type WorkspaceRole = "owner" | "editor" | "commenter" | "viewer";
export type PlanTier = "free" | "pro" | "team" | "university";

export interface Permission {
  action: string;
  resource: string;
}

/**
 * 역할별 권한 매핑
 */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    { action: "create", resource: "project" },
    { action: "delete", resource: "project" },
    { action: "edit", resource: "project" },
    { action: "read", resource: "project" },
    { action: "manage", resource: "members" },
    { action: "manage", resource: "settings" },
    { action: "manage", resource: "billing" },
    { action: "delete", resource: "workspace" },
  ],
  editor: [
    { action: "create", resource: "project" },
    { action: "edit", resource: "project" },
    { action: "read", resource: "project" },
    { action: "comment", resource: "project" },
  ],
  commenter: [
    { action: "read", resource: "project" },
    { action: "comment", resource: "project" },
  ],
  viewer: [
    { action: "read", resource: "project" },
  ],
};

/**
 * 플랜별 제한사항
 */
export const PLAN_LIMITS: Record<PlanTier, {
  maxProjects: number;
  maxWorkspaceMembers: number;
  maxCritiquePerMonth: number;
  realtimeCollaboration: boolean;
  advancedValidation: boolean;
  advisorAI: boolean;
  citationAutomation: boolean;
}> = {
  free: {
    maxProjects: 3,
    maxWorkspaceMembers: 1,
    maxCritiquePerMonth: 5,
    realtimeCollaboration: false,
    advancedValidation: false,
    advisorAI: false,
    citationAutomation: false,
  },
  pro: {
    maxProjects: -1, // unlimited
    maxWorkspaceMembers: 5,
    maxCritiquePerMonth: -1,
    realtimeCollaboration: true,
    advancedValidation: true,
    advisorAI: true,
    citationAutomation: true,
  },
  team: {
    maxProjects: -1,
    maxWorkspaceMembers: 20,
    maxCritiquePerMonth: -1,
    realtimeCollaboration: true,
    advancedValidation: true,
    advisorAI: true,
    citationAutomation: true,
  },
  university: {
    maxProjects: -1,
    maxWorkspaceMembers: -1,
    realtimeCollaboration: true,
    maxCritiquePerMonth: -1,
    advancedValidation: true,
    advisorAI: true,
    citationAutomation: true,
  },
};

/**
 * 권한 체크 헬퍼
 */
export function hasPermission(
  role: WorkspaceRole,
  action: string,
  resource: string
): boolean {
  return ROLE_PERMISSIONS[role].some(
    (p) => p.action === action && p.resource === resource
  );
}

/**
 * 플랜 제한 체크 헬퍼
 */
export function checkPlanLimit(
  plan: PlanTier,
  feature: keyof typeof PLAN_LIMITS.free
): boolean | number {
  return PLAN_LIMITS[plan][feature];
}

export * from "./membership";
