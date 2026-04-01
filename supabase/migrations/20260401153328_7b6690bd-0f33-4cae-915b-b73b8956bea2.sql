
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'change_manager', 'team_lead', 'end_user');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================== CUSTOMERS ====================
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  slogan TEXT,
  support_email TEXT,
  color_accent TEXT DEFAULT '#3B82F6',
  rolling_window_days INT DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'end_user',
  customer_id UUID REFERENCES public.customers(id),
  team TEXT,
  persona TEXT,
  streak INT DEFAULT 0,
  points INT DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== USER ROLES ====================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==================== INITIATIVES ====================
CREATE TABLE public.initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('active', 'planning', 'completed')),
  start_date DATE,
  end_date DATE,
  phase TEXT NOT NULL DEFAULT 'design_build' CHECK (phase IN ('design_build', 'training_testing', 'post_go_live')),
  progress INT DEFAULT 0,
  user_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read initiatives" ON public.initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage initiatives" ON public.initiatives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_initiatives_updated_at BEFORE UPDATE ON public.initiatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== MILESTONES ====================
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  weight INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  progress INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read milestones" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage milestones" ON public.milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== JOURNEYS ====================
CREATE TABLE public.journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'completed')),
  weight INT DEFAULT 0,
  progress INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read journeys" ON public.journeys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage journeys" ON public.journeys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_journeys_updated_at BEFORE UPDATE ON public.journeys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== JOURNEY ITEMS ====================
CREATE TABLE public.journey_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('content', 'activity', 'form', 'confidence_check', 'evidence_upload', 'reflection', 'scenario')),
  title TEXT NOT NULL,
  description TEXT,
  weight INT DEFAULT 0,
  duration TEXT,
  mandatory BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  contributes_to TEXT[] DEFAULT '{}',
  due_date DATE,
  completed_date DATE,
  reminder_enabled BOOLEAN DEFAULT false,
  predecessor_id UUID REFERENCES public.journey_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journey_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read journey_items" ON public.journey_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage journey_items" ON public.journey_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_journey_items_updated_at BEFORE UPDATE ON public.journey_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== ASSIGNMENTS ====================
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, journey_id)
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read assignments" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage assignments" ON public.assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== CONTENT ITEMS ====================
CREATE TABLE public.content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('document', 'video', 'image', 'audio', 'announcement', 'standard_form', 'confidence_form')),
  file_url TEXT,
  thumbnail_url TEXT,
  content_body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  initiative_id UUID REFERENCES public.initiatives(id),
  publish_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read content_items" ON public.content_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage content_items" ON public.content_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== ACTIVITY EVENTS ====================
CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  journey_item_id UUID REFERENCES public.journey_items(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read activity_events" ON public.activity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity_events" ON public.activity_events FOR INSERT TO authenticated WITH CHECK (true);

-- ==================== SCORES ====================
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  initiative_id UUID REFERENCES public.initiatives(id),
  participation NUMERIC DEFAULT 0,
  ownership NUMERIC DEFAULT 0,
  confidence NUMERIC DEFAULT 0,
  adoption NUMERIC DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, initiative_id)
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read scores" ON public.scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage scores" ON public.scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== SCORE HISTORY ====================
CREATE TABLE public.score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  initiative_id UUID REFERENCES public.initiatives(id),
  participation NUMERIC DEFAULT 0,
  ownership NUMERIC DEFAULT 0,
  confidence NUMERIC DEFAULT 0,
  adoption NUMERIC DEFAULT 0,
  week_label TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read score_history" ON public.score_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage score_history" ON public.score_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== BADGES ====================
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  tier TEXT CHECK (tier IN ('Starter', 'Contributor', 'Owner', 'Leader')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage badges" ON public.badges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== USER BADGES ====================
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read user_badges" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage user_badges" ON public.user_badges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== POINTS LEDGER ====================
CREATE TABLE public.points_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  points INT NOT NULL,
  reason TEXT,
  journey_item_id UUID REFERENCES public.journey_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read points_ledger" ON public.points_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage points_ledger" ON public.points_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================== ANNOUNCEMENTS ====================
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'action', 'celebration')),
  active BOOLEAN DEFAULT true,
  customer_id UUID REFERENCES public.customers(id),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage announcements" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== RISK FLAGS ====================
CREATE TABLE public.risk_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  description TEXT,
  recommendation TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read risk_flags" ON public.risk_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage risk_flags" ON public.risk_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_risk_flags_updated_at BEFORE UPDATE ON public.risk_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== REMINDERS ====================
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  journey_item_id UUID REFERENCES public.journey_items(id),
  type TEXT NOT NULL CHECK (type IN ('due_soon', 'overdue', 'inactivity', 'milestone', 'congratulatory', 'low_confidence')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read reminders" ON public.reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage reminders" ON public.reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);
