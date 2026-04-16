
-- ============================================================
-- 1. Remove anon WRITE policies from critical tables
-- ============================================================

-- scoring_config: remove anon insert and update
DROP POLICY IF EXISTS "Anon can insert scoring_config" ON public.scoring_config;
DROP POLICY IF EXISTS "Anon can update scoring_config" ON public.scoring_config;

-- journey_items: remove anon insert, update, delete
DROP POLICY IF EXISTS "Anon can insert journey_items" ON public.journey_items;
DROP POLICY IF EXISTS "Anon can update journey_items" ON public.journey_items;
DROP POLICY IF EXISTS "Anon can delete journey_items" ON public.journey_items;

-- journey_phases: remove anon insert, update, delete
DROP POLICY IF EXISTS "Anon can insert journey_phases" ON public.journey_phases;
DROP POLICY IF EXISTS "Anon can update journey_phases" ON public.journey_phases;
DROP POLICY IF EXISTS "Anon can delete journey_phases" ON public.journey_phases;

-- content_items: remove anon insert, update
DROP POLICY IF EXISTS "Anon can insert content_items" ON public.content_items;
DROP POLICY IF EXISTS "Anon can update content_items" ON public.content_items;

-- assignments: remove anon insert
DROP POLICY IF EXISTS "Anon can insert assignments" ON public.assignments;

-- risk_flags: remove anon update
DROP POLICY IF EXISTS "Anon can update risk_flags" ON public.risk_flags;

-- initiatives: remove anon insert, update
DROP POLICY IF EXISTS "Anon can insert initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Anon can update initiatives" ON public.initiatives;

-- milestones: remove anon insert
DROP POLICY IF EXISTS "Anon can insert milestones" ON public.milestones;

-- agent_conversations: remove anon insert
DROP POLICY IF EXISTS "Anon can insert agent_conversations" ON public.agent_conversations;

-- agent_messages: remove anon insert
DROP POLICY IF EXISTS "Anon can insert agent_messages" ON public.agent_messages;

-- insight_records: remove anon insert
DROP POLICY IF EXISTS "Anon can insert insight_records" ON public.insight_records;

-- recommendation_records: remove anon insert
DROP POLICY IF EXISTS "Anon can insert recommendation_records" ON public.recommendation_records;

-- ai_change_log: remove anon insert
DROP POLICY IF EXISTS "Anon can insert ai_change_log" ON public.ai_change_log;

-- ============================================================
-- 2. Fix privilege escalation on user_roles
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can manage user_roles" ON public.user_roles;

-- Only super_admins can manage user_roles
CREATE POLICY "Only super_admins can manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 3. Fix storage: remove anon write access to content-assets
-- ============================================================

DROP POLICY IF EXISTS "Anon can upload content assets" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update content assets" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete content assets" ON storage.objects;

-- Re-create write policies for authenticated users only
CREATE POLICY "Authenticated can upload content assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-assets');

CREATE POLICY "Authenticated can update content assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-assets');

CREATE POLICY "Authenticated can delete content assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-assets');
