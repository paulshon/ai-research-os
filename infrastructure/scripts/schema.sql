-- ═══════════════════════════════════════════
-- AI Research OS — Database Schema v4
-- Supabase PostgreSQL + Clerk Auth 연동
-- ═══════════════════════════════════════════
-- ⚠️ 기존 테이블이 있으면 삭제 후 재생성합니다.
-- 주의: 기존 데이터가 모두 삭제됩니다.

-- 기존 테이블 삭제 (의존성 역순)
DROP TABLE IF EXISTS public.ai_usage CASCADE;
DROP TABLE IF EXISTS public.annotations CASCADE;
DROP TABLE IF EXISTS public.workflow_tasks CASCADE;
DROP TABLE IF EXISTS public.validation_results CASCADE;
DROP TABLE IF EXISTS public.citations CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS requesting_user_id();
DROP FUNCTION IF EXISTS update_updated_at();

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════
-- Clerk JWT에서 user_id 추출 헬퍼
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- 테이블 생성 (profiles.id = TEXT for Clerk user_id)
-- ═══════════════════════════════════════════

-- Profiles (Clerk user_id = TEXT)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  orcid_id TEXT,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student','researcher','professor','admin')),
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free','pro','team','university')),
  gemini_model TEXT DEFAULT 'gemini-2.5-flash',
  language TEXT DEFAULT 'ko',
  theme TEXT DEFAULT 'dark',
  editor_font_size INTEGER DEFAULT 14,
  auto_save BOOLEAN DEFAULT true,
  local_storage_path TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  is_special_member BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'personal'
    CHECK (type IN ('personal','team','professor','student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace Members
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor'
    CHECK (role IN ('owner','editor','commenter','viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thesis_type TEXT NOT NULL DEFAULT 'quant',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','review','completed')),
  university TEXT,
  department TEXT,
  advisor TEXT,
  deadline TIMESTAMPTZ,
  keywords TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chapters
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  word_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'empty'
    CHECK (status IN ('empty','draft','writing','review','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sections
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  content_yjs_state BYTEA,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Citations
CREATE TABLE public.citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  doi TEXT,
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  year INTEGER,
  journal TEXT,
  volume TEXT,
  pages TEXT,
  url TEXT,
  format TEXT NOT NULL DEFAULT 'apa7'
    CHECK (format IN ('apa7','mla9','chicago','ieee','vancouver')),
  bibtex TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation Results
CREATE TABLE public.validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error','warning','info')),
  message TEXT NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  suggestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow Tasks
CREATE TABLE public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','blocked')),
  assigned_to TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Annotations
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  paragraph_index INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','resolved')),
  author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Usage
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  engine TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX idx_chapters_project ON public.chapters(project_id);
CREATE INDEX idx_sections_chapter ON public.sections(chapter_id);
CREATE INDEX idx_citations_project ON public.citations(project_id);
CREATE INDEX idx_workflow_project ON public.workflow_tasks(project_id);
CREATE INDEX idx_validation_project ON public.validation_results(project_id);
CREATE INDEX idx_annotations_document ON public.annotations(document_id);
CREATE INDEX idx_ai_usage_user ON public.ai_usage(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);

-- ═══════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Clerk JWT)
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (id = requesting_user_id());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = requesting_user_id());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = requesting_user_id());

CREATE POLICY workspaces_select ON public.workspaces FOR SELECT USING (
  owner_id = requesting_user_id() OR
  EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspaces.id AND user_id = requesting_user_id())
);
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT WITH CHECK (owner_id = requesting_user_id());
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE USING (owner_id = requesting_user_id());
CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE USING (owner_id = requesting_user_id());

CREATE POLICY projects_select ON public.projects FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    LEFT JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE w.id = projects.workspace_id AND (w.owner_id = requesting_user_id() OR wm.user_id = requesting_user_id())
  )
);
CREATE POLICY projects_insert ON public.projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = requesting_user_id())
);

-- Chapters/Sections/Citations: project 소유자 접근
CREATE POLICY chapters_select ON public.chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.workspaces w ON w.id = p.workspace_id
    LEFT JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE p.id = chapters.project_id AND (w.owner_id = requesting_user_id() OR wm.user_id = requesting_user_id()))
);
CREATE POLICY chapters_insert ON public.chapters FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.workspaces w ON w.id = p.workspace_id WHERE p.id = project_id AND w.owner_id = requesting_user_id())
);
CREATE POLICY chapters_update ON public.chapters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.workspaces w ON w.id = p.workspace_id WHERE p.id = chapters.project_id AND w.owner_id = requesting_user_id())
);

CREATE POLICY sections_all ON public.sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.chapters c JOIN public.projects p ON p.id = c.project_id JOIN public.workspaces w ON w.id = p.workspace_id
    WHERE c.id = sections.chapter_id AND w.owner_id = requesting_user_id())
);

CREATE POLICY citations_all ON public.citations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.workspaces w ON w.id = p.workspace_id WHERE p.id = citations.project_id AND w.owner_id = requesting_user_id())
);

CREATE POLICY validation_all ON public.validation_results FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.workspaces w ON w.id = p.workspace_id WHERE p.id = validation_results.project_id AND w.owner_id = requesting_user_id())
);

CREATE POLICY workflow_all ON public.workflow_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.workspaces w ON w.id = p.workspace_id WHERE p.id = workflow_tasks.project_id AND w.owner_id = requesting_user_id())
);

CREATE POLICY annotations_all ON public.annotations FOR ALL USING (author_id = requesting_user_id());
CREATE POLICY ai_usage_all ON public.ai_usage FOR ALL USING (user_id = requesting_user_id());

-- ═══════════════════════════════════════════
-- Auto-update timestamps
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chapters_updated BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sections_updated BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workflow_updated BEFORE UPDATE ON public.workflow_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
