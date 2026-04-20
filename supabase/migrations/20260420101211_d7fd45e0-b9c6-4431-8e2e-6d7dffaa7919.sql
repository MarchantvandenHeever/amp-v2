
-- forms table
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled form',
  activity_type text,
  phase text,
  focus text,
  purpose text,
  user_instruction text,
  completion_message text,
  status text NOT NULL DEFAULT 'draft',
  source_document_name text,
  extraction_confidence numeric DEFAULT 0,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  journey_item_id uuid REFERENCES public.journey_items(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- form_sections table
CREATE TABLE public.form_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  title text,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- form_questions table
CREATE TABLE public.form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.form_sections(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'short_text',
  required boolean NOT NULL DEFAULT false,
  scale jsonb,
  options jsonb,
  help_text text,
  needs_review boolean NOT NULL DEFAULT false,
  extraction_confidence numeric DEFAULT 0,
  scored boolean NOT NULL DEFAULT false,
  mandatory boolean NOT NULL DEFAULT false,
  score_dimension text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_sections_form ON public.form_sections(form_id, order_index);
CREATE INDEX idx_form_questions_section ON public.form_questions(section_id, order_index);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;

-- forms policies
CREATE POLICY "Anyone authenticated can read forms"
  ON public.forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read forms"
  ON public.forms FOR SELECT TO anon USING (true);
CREATE POLICY "Admins and CM can manage forms"
  ON public.forms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'change_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'change_manager'));

-- form_sections policies
CREATE POLICY "Anyone authenticated can read form_sections"
  ON public.form_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read form_sections"
  ON public.form_sections FOR SELECT TO anon USING (true);
CREATE POLICY "Admins and CM can manage form_sections"
  ON public.form_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'change_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'change_manager'));

-- form_questions policies
CREATE POLICY "Anyone authenticated can read form_questions"
  ON public.form_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read form_questions"
  ON public.form_questions FOR SELECT TO anon USING (true);
CREATE POLICY "Admins and CM can manage form_questions"
  ON public.form_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'change_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'change_manager'));

-- updated_at triggers
CREATE TRIGGER trg_forms_updated_at BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_form_sections_updated_at BEFORE UPDATE ON public.form_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_form_questions_updated_at BEFORE UPDATE ON public.form_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
