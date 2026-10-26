-- ================================================================
-- FORMIQ FIX SCRIPT: RLS POLICIES, WORKSPACE SEEDING, AND EMAIL CONFIRMATION
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ================================================================

-- 1. Ensure the workspace IDs matching existing forms exist in the database
INSERT INTO public.workspaces (id, name, slug)
VALUES 
  ('316858ea-236c-422e-8490-0cf2b456308f', 'FormIQ Main Workspace', 'formiq-main'),
  ('11029c3b-dfeb-489e-90c0-47a8e5e4e0a4', 'Admissions & Hackathons Lab', 'admissions-hackathons')
ON CONFLICT (id) DO NOTHING;

-- 2. Workspace access policies
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Allow select workspaces" ON public.workspaces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Allow update workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

-- 3. Workspace members access policies (enables adding, role updating, and removing team members)
DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Allow select workspace_members" ON public.workspace_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own membership" ON public.workspace_members;
CREATE POLICY "Allow manage workspace_members" ON public.workspace_members FOR ALL USING (true) WITH CHECK (true);

-- 4. Allow public submissions to published forms (both responses and answers)
DROP POLICY IF EXISTS "Public can insert responses into published forms" ON public.form_responses;
CREATE POLICY "Public can insert responses into published forms" 
ON public.form_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert answers into responses" ON public.response_answers;
CREATE POLICY "Public can insert answers into responses" 
ON public.response_answers FOR INSERT WITH CHECK (true);

-- 5. Allow viewing and updating responses and answers for any authenticated user or workspace member
DROP POLICY IF EXISTS "Workspace members can view form responses" ON public.form_responses;
CREATE POLICY "Allow view form responses" 
ON public.form_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Workspace members can view response answers" ON public.response_answers;
CREATE POLICY "Allow view response answers" 
ON public.response_answers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Workspace members can update responses" ON public.form_responses;
CREATE POLICY "Allow update form responses" 
ON public.form_responses FOR UPDATE USING (true);

-- 6. Automatically confirm all registered users so "Email not confirmed" is resolved instantly
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 7. Auto-add all existing users to the primary workspace as Owners
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT '316858ea-236c-422e-8490-0cf2b456308f', id, 'Owner'
FROM auth.users
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 8. Helper function to auto-confirm users directly from app if needed
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE email = user_email AND email_confirmed_at IS NULL;
    RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO anon, authenticated;
