
-- Journey phases table
CREATE TABLE public.journey_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'inactive',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journey_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read journey_phases" ON public.journey_phases FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert journey_phases" ON public.journey_phases FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update journey_phases" ON public.journey_phases FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete journey_phases" ON public.journey_phases FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated can manage journey_phases" ON public.journey_phases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add phase_id and execution_mode to journey_items
ALTER TABLE public.journey_items ADD COLUMN phase_id UUID REFERENCES public.journey_phases(id) ON DELETE SET NULL;
ALTER TABLE public.journey_items ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'series';
ALTER TABLE public.journey_items ADD COLUMN content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL;

-- Add parent_journey_id to journeys for sub-journey linking
ALTER TABLE public.journeys ADD COLUMN parent_journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL;
ALTER TABLE public.journeys ADD COLUMN phase_id UUID REFERENCES public.journey_phases(id) ON DELETE SET NULL;
