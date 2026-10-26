-- ====================================================================
-- PART 2: ROW LEVEL SECURITY & REALTIME
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

-- Helper function: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ws_id AND wm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspaces policies
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Members can view workspaces" ON public.workspaces FOR SELECT USING (public.is_workspace_member(id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Owners can update workspaces" ON public.workspaces FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert workspaces" ON public.workspaces;
CREATE POLICY "Users can insert workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace members policies
DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Members can view membership" ON public.workspace_members FOR SELECT USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Users can insert own membership" ON public.workspace_members;
CREATE POLICY "Users can insert own membership" ON public.workspace_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- Forms policies
DROP POLICY IF EXISTS "Workspace members can view forms" ON public.forms;
CREATE POLICY "Workspace members can view forms" ON public.forms FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Public can view published forms" ON public.forms;
CREATE POLICY "Public can view published forms" ON public.forms FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Workspace editors can insert forms" ON public.forms;
CREATE POLICY "Workspace editors can insert forms" ON public.forms FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace editors can update forms" ON public.forms;
CREATE POLICY "Workspace editors can update forms" ON public.forms FOR UPDATE USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace owners can delete forms" ON public.forms;
CREATE POLICY "Workspace owners can delete forms" ON public.forms FOR DELETE USING (public.is_workspace_member(workspace_id));

-- Form questions policies
DROP POLICY IF EXISTS "Workspace members can view questions" ON public.form_questions;
CREATE POLICY "Workspace members can view questions" ON public.form_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_questions.form_id AND public.is_workspace_member(f.workspace_id)));

DROP POLICY IF EXISTS "Public can view questions of published forms" ON public.form_questions;
CREATE POLICY "Public can view questions of published forms" ON public.form_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_questions.form_id AND f.status = 'published'));

DROP POLICY IF EXISTS "Workspace editors can manage questions" ON public.form_questions;
CREATE POLICY "Workspace editors can manage questions" ON public.form_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_questions.form_id AND public.is_workspace_member(f.workspace_id)));

-- Form responses policies
DROP POLICY IF EXISTS "Public can insert responses into published forms" ON public.form_responses;
CREATE POLICY "Public can insert responses into published forms" ON public.form_responses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND f.status = 'published'));

DROP POLICY IF EXISTS "Workspace members can view form responses" ON public.form_responses;
CREATE POLICY "Workspace members can view form responses" ON public.form_responses FOR SELECT USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND public.is_workspace_member(f.workspace_id)));

DROP POLICY IF EXISTS "Workspace members can update responses" ON public.form_responses;
CREATE POLICY "Workspace members can update responses" ON public.form_responses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_responses.form_id AND public.is_workspace_member(f.workspace_id)));

-- Response answers policies
DROP POLICY IF EXISTS "Public can insert answers into responses" ON public.response_answers;
CREATE POLICY "Public can insert answers into responses" ON public.response_answers FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.form_responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = response_answers.response_id AND f.status = 'published'
));

DROP POLICY IF EXISTS "Workspace members can view response answers" ON public.response_answers;
CREATE POLICY "Workspace members can view response answers" ON public.response_answers FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.form_responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = response_answers.response_id AND public.is_workspace_member(f.workspace_id)
));

-- Analytics and insights policies
DROP POLICY IF EXISTS "Workspace members can view analytics" ON public.form_analytics;
CREATE POLICY "Workspace members can view analytics" ON public.form_analytics FOR ALL USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_analytics.form_id AND public.is_workspace_member(f.workspace_id)));

DROP POLICY IF EXISTS "Workspace members can view ai_insights" ON public.ai_insights;
CREATE POLICY "Workspace members can view ai_insights" ON public.ai_insights FOR ALL USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = ai_insights.form_id AND public.is_workspace_member(f.workspace_id)));

-- Notifications policies
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- Files & audit logs policies
DROP POLICY IF EXISTS "Workspace members can view files" ON public.files;
CREATE POLICY "Workspace members can view files" ON public.files FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can view audit logs" ON public.audit_logs;
CREATE POLICY "Workspace members can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_workspace_member(workspace_id));

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
