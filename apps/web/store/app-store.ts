/**
 * Global Store — Zustand
 * Replaces the `state` object from original index.html
 *
 * BEFORE (original):
 *   const state = {
 *     settings: { apiKey: '', model: 'gemini-2.5-flash' },
 *     projects: [],
 *     currentProject: null,
 *     ...
 *   }
 *
 * AFTER: Zustand store with TypeScript safety
 */

import { create } from "zustand";
import type {
  Project,
  UserSettings,
  ThesisType,
} from "@ai-research-os/shared-types";

interface AppState {
  // User settings
  settings: UserSettings;
  setSettings: (s: Partial<UserSettings>) => void;

  // Current workspace
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (id: string) => void;

  // Projects
  projects: Project[];
  currentProjectId: string | null;
  setProjects: (p: Project[]) => void;
  setCurrentProject: (id: string | null) => void;

  // Active page/view
  activePage: string;
  setActivePage: (page: string) => void;

  // Thesis type selection
  selectedThesisType: ThesisType;
  setThesisType: (t: ThesisType) => void;

  // AI state
  isAILoading: boolean;
  setAILoading: (v: boolean) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: {
    gemini_model: "gemini-2.5-flash",
    language: "ko",
    theme: "dark",
    editor_font_size: 14,
    auto_save: true,
  },
  setSettings: (s) =>
    set((state) => ({ settings: { ...state.settings, ...s } })),

  currentWorkspaceId: null,
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),

  projects: [],
  currentProjectId: null,
  setProjects: (p) => set({ projects: p }),
  setCurrentProject: (id) => set({ currentProjectId: id }),

  activePage: "structure",
  setActivePage: (page) => set({ activePage: page }),

  selectedThesisType: "quantitative",
  setThesisType: (t) => set({ selectedThesisType: t }),

  isAILoading: false,
  setAILoading: (v) => set({ isAILoading: v }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
