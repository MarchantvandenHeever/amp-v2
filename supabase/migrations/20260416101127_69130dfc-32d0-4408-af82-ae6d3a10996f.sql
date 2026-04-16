
-- 1. agent_conversations
CREATE TABLE public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  context_type text NOT NULL DEFAULT 'support' CHECK (context_type IN ('builder', 'support')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON public.agent_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can create own conversations"
  ON public.agent_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can read agent_conversations"
  ON public.agent_conversations FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert agent_conversations"
  ON public.agent_conversations FOR INSERT TO anon
  WITH CHECK (true);

CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. agent_messages
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  structured_output jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages in own conversations"
  ON public.agent_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON public.agent_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Anon can read agent_messages"
  ON public.agent_messages FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert agent_messages"
  ON public.agent_messages FOR INSERT TO anon
  WITH CHECK (true);

-- 3. insight_records
CREATE TABLE public.insight_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  journey_item_id uuid REFERENCES public.journey_items(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  persona text,
  team text,
  insight_type text NOT NULL,
  topic text,
  summary text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score numeric DEFAULT 0,
  inferred_dimension text CHECK (inferred_dimension IN ('participation', 'ownership', 'confidence')),
  inferred_issue text,
  supporting_evidence_summary text,
  suggested_intervention text,
  source_type text NOT NULL DEFAULT 'system' CHECK (source_type IN ('chat', 'task', 'form', 'content', 'reminder', 'evidence', 'system')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'dismissed')),
  is_sample boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insight_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CM and admins can read insights"
  ON public.insight_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "CM and admins can manage insights"
  ON public.insight_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anon can read insight_records"
  ON public.insight_records FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert insight_records"
  ON public.insight_records FOR INSERT TO anon
  WITH CHECK (true);

-- 4. recommendation_records
CREATE TABLE public.recommendation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  description text,
  rationale text,
  linked_insight_ids uuid[] DEFAULT '{}',
  impacted_personas text[] DEFAULT '{}',
  impacted_items uuid[] DEFAULT '{}',
  expected_impact text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority integer DEFAULT 50,
  proposed_change_json jsonb DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'dismissed', 'saved')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  applied_at timestamptz,
  is_sample boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CM and admins can read recommendations"
  ON public.recommendation_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "CM and admins can manage recommendations"
  ON public.recommendation_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anon can read recommendation_records"
  ON public.recommendation_records FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert recommendation_records"
  ON public.recommendation_records FOR INSERT TO anon
  WITH CHECK (true);

-- 5. ai_change_log
CREATE TABLE public.ai_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid REFERENCES public.recommendation_records(id) ON DELETE SET NULL,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  journey_item_id uuid REFERENCES public.journey_items(id) ON DELETE SET NULL,
  change_type text NOT NULL,
  before_state jsonb DEFAULT '{}'::jsonb,
  after_state jsonb DEFAULT '{}'::jsonb,
  rationale text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CM and admins can read change log"
  ON public.ai_change_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "CM and admins can manage change log"
  ON public.ai_change_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'change_manager') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anon can read ai_change_log"
  ON public.ai_change_log FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert ai_change_log"
  ON public.ai_change_log FOR INSERT TO anon
  WITH CHECK (true);

-- 6. prompt_templates
CREATE TABLE public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  template_text text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prompt_templates"
  ON public.prompt_templates FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage prompt_templates"
  ON public.prompt_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_agent_conversations_user ON public.agent_conversations(user_id);
CREATE INDEX idx_agent_conversations_initiative ON public.agent_conversations(initiative_id);
CREATE INDEX idx_agent_messages_conversation ON public.agent_messages(conversation_id);
CREATE INDEX idx_insight_records_initiative ON public.insight_records(initiative_id);
CREATE INDEX idx_insight_records_type ON public.insight_records(insight_type);
CREATE INDEX idx_insight_records_status ON public.insight_records(status);
CREATE INDEX idx_recommendation_records_initiative ON public.recommendation_records(initiative_id);
CREATE INDEX idx_recommendation_records_status ON public.recommendation_records(review_status);
CREATE INDEX idx_ai_change_log_journey ON public.ai_change_log(journey_id);
