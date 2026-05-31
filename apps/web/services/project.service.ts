/**
 * Project Service
 * BEFORE: Projects stored in local JSON via Electron IPC (projects:list, projects:save)
 * AFTER: Projects stored in Supabase PostgreSQL, with local cache for desktop
 */

import { supabase } from "./auth.service";
import type { Project, ThesisType } from "@ai-research-os/shared-types";

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProject(params: {
  workspace_id: string;
  title: string;
  thesis_type: ThesisType;
  description?: string;
}): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert(params)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
