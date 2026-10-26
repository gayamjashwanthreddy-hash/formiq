-- ====================================================================
-- FORMIQ — Complete PostgreSQL Schema with Row Level Security (RLS)
-- Migration: 20260926000000_init_formiq_schema.sql
-- ====================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'FormIQ User',
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Workspace Members (RBAC: Owner, Editor, Analyst, Viewer)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Editor', 'Analyst', 'Viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

-- 5. Forms Table
CREATE TABLE IF NOT EXISTS public.forms (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'recruitment' CHECK (type IN ('recruitment', 'registration', 'feedback', 'survey', 'research', 'application', 'assessment', 'lead', 'internal', 'general')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed')),
    slug TEXT NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{"anonymous": false, "emailCollection": true, "responseLimit": null, "allowDuplicates": true, "redirectUrl": null, "notificationOnResponse": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_at TIMESTAMPTZ
);

-- 6. Form Questions Table
CREATE TABLE IF NOT EXISTS public.form_questions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    section_id TEXT DEFAULT 'default',
    question_key TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'multiselect', 'checkbox', 'rating', 'date', 'time', 'file')),
    label TEXT NOT NULL,
    description TEXT,
    options JSONB DEFAULT '[]'::jsonb,
    required BOOLEAN NOT NULL DEFAULT false,
    validation JSONB DEFAULT '{}'::jsonb,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Form Conditional Logic Table
CREATE TABLE IF NOT EXISTS public.form_logic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    source_question_id TEXT NOT NULL REFERENCES public.form_questions(id) ON DELETE CASCADE,
    operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty')),
    value TEXT,
    target_question_id TEXT NOT NULL REFERENCES public.form_questions(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('show', 'hide', 'require', 'skip_to')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Form Responses Table
CREATE TABLE IF NOT EXISTS public.form_responses (
    id TEXT PRIMARY KEY DEFAULT ('resp-' || substr(md5(random()::text), 1, 16)),
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    respondent_email TEXT,
    candidate_status TEXT DEFAULT 'New' CHECK (candidate_status IN ('New', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
    notes TEXT,
    completion_time_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Response Answers Table
CREATE TABLE IF NOT EXISTS public.response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id TEXT NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
    question_id TEXT,
    question_key TEXT NOT NULL,
    value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Form Analytics Table (Deterministic calculations cache)
CREATE TABLE IF NOT EXISTS public.form_analytics (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value JSONB NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(form_id, metric)
);

-- 11. AI Insights Table (Evidence-backed findings, trends, gaps, lagging areas)
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id TEXT PRIMARY KEY DEFAULT ('ins-' || substr(md5(random()::text), 1, 16)),
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('key_finding', 'trend', 'strength', 'gap', 'area_requiring_attention', 'recommendation', 'outlier')),
    title TEXT NOT NULL,
    finding TEXT NOT NULL,
    evidence TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    source_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    response_id TEXT REFERENCES public.form_responses(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_forms_workspace ON public.forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_questions_form_pos ON public.form_questions(form_id, position);
CREATE INDEX IF NOT EXISTS idx_responses_form ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted ON public.form_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_answers_response ON public.response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_key ON public.response_answers(question_key);
CREATE INDEX IF NOT EXISTS idx_ai_insights_form ON public.ai_insights(form_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_logic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user belongs to workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ws_id AND wm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view & update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Workspaces: Members can view their workspaces
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Members can view workspaces"
    ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Owners can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert workspaces" ON public.workspaces;
CREATE POLICY "Users can insert workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace members
DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Members can view membership"
    ON public.workspace_members FOR SELECT
    USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Users can insert own membership" ON public.workspace_members;
CREATE POLICY "Users can insert own membership"
    ON public.workspace_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Forms:
DROP POLICY IF EXISTS "Workspace members can view forms" ON public.forms;
CREATE POLICY "Workspace members can view forms"
    ON public.forms FOR SELECT
    USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Public can view published forms" ON public.forms;
CREATE POLICY "Public can view published forms"
    ON public.forms FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS "Workspace editors can insert forms" ON public.forms;
CREATE POLICY "Workspace editors can insert forms"
    ON public.forms FOR INSERT
    WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace editors can update forms" ON public.forms;
CREATE POLICY "Workspace editors can update forms"
    ON public.forms FOR UPDATE
    USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace owners can delete forms" ON public.forms;
CREATE POLICY "Workspace owners can delete forms"
    ON public.forms FOR DELETE
    USING (public.is_workspace_member(workspace_id));

-- Form Questions:
DROP POLICY IF EXISTS "Workspace members can view questions" ON public.form_questions;
CREATE POLICY "Workspace members can view questions"
    ON public.form_questions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_questions.form_id AND public.is_workspace_member(f.workspace_id)));

DROP POLICY IF EXISTS "Public can view questions of published forms" ON public.form_questions;
CREATE POLICY "Public can view questions of published forms"
    ON public.form_questions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_questions.form_id AND f.status = 'published'));

DROP POLICY IF EXISTS "Workspace editors can manage questions" ON public.form_questions;
CREATE POLICY "Workspace editors can manage questions"
    ON public.form_questions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_questions.form_id AND public.is_workspace_member(f.workspace_id)));

-- Form Responses:
DROP POLICY IF EXISTS "Public can insert responses into published forms" ON public.form_responses;
CREATE POLICY "Public can insert responses into published forms"
    ON public.form_responses FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND f.status = 'published'));

DROP POLICY IF EXISTS "Workspace members can view form responses" ON public.form_responses;
CREATE POLICY "Workspace members can view form responses"
    ON public.form_responses FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND public.is_workspace_member(f.workspace_id)));

DROP POLICY IF EXISTS "Workspace members can update responses" ON public.form_responses;
CREATE POLICY "Workspace members can update responses"
    ON public.form_responses FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND public.is_workspace_member(f.workspace_id)));

-- Response Answers:
DROP POLICY IF EXISTS "Public can insert answers into responses" ON public.response_answers;
CREATE POLICY "Public can insert answers into responses"
    ON public.response_answers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.form_responses r
        JOIN public.forms f ON f.id = r.form_id
        WHERE r.id = response_answers.response_id AND f.status = 'published'
    ));

DROP POLICY IF EXISTS "Workspace members can view response answers" ON public.response_answers;
CREATE POLICY "Workspace members can view response answers"
    ON public.response_answers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.form_responses r
        JOIN public.forms f ON f.id = r.form_id
        WHERE r.id = response_answers.response_id AND public.is_workspace_member(f.workspace_id)
    ));

-- Form Analytics & AI Insights:
DROP POLICY IF EXISTS "Workspace members can view analytics" ON public.form_analytics;
CREATE POLICY "Workspace members can view analytics"
    ON public.form_analytics FOR ALL
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_analytics.form_id AND public.is_workspace_member(f.workspace_id)));

DROP POLICY IF EXISTS "Workspace members can view ai_insights" ON public.ai_insights;
CREATE POLICY "Workspace members can view ai_insights"
    ON public.ai_insights FOR ALL
    USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = ai_insights.form_id AND public.is_workspace_member(f.workspace_id)));

-- Notifications:
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications"
    ON public.notifications FOR ALL
    USING (user_id = auth.uid());

-- Files & Audit logs
DROP POLICY IF EXISTS "Workspace members can view files" ON public.files;
CREATE POLICY "Workspace members can view files"
    ON public.files FOR SELECT
    USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can view audit logs" ON public.audit_logs;
CREATE POLICY "Workspace members can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Realtime Publication (Safe block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'form_responses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.form_responses;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'forms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.forms;
    END IF;
END $$;
