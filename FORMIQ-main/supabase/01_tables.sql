-- ====================================================================
-- PART 1: FORMIQ TABLES & INDEXES
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'FormIQ User',
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Workspace Members
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Editor', 'Analyst', 'Viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

-- 4. Forms
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

-- 5. Form Questions
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

-- 6. Form Conditional Logic
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

-- 7. Form Responses
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

-- 8. Response Answers
CREATE TABLE IF NOT EXISTS public.response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id TEXT NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
    question_id TEXT,
    question_key TEXT NOT NULL,
    value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Form Analytics
CREATE TABLE IF NOT EXISTS public.form_analytics (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value JSONB NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(form_id, metric)
);

-- 10. AI Insights
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

-- 11. Files
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

-- 12. Notifications
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

-- 13. Audit Logs
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forms_workspace ON public.forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_questions_form_pos ON public.form_questions(form_id, position);
CREATE INDEX IF NOT EXISTS idx_responses_form ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted ON public.form_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_answers_response ON public.response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_key ON public.response_answers(question_key);
CREATE INDEX IF NOT EXISTS idx_ai_insights_form ON public.ai_insights(form_id);
