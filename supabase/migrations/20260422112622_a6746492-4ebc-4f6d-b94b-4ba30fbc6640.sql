-- ============================================================================
-- AMP Behavioural Adoption Scoring Model — schema rebuild
-- Single source of truth: AMP_Behavioural_Adoption_Scoring_Model.pdf
--                        Participation_Scoring_Algorithm_Framework.pdf
--                        Ownership_Scoring_Algorithm_Framework.pdf
--                        Confidence_Scoring_Algorithm_Framework.pdf
-- ============================================================================

-- 1. behavioural_events: append-only log of every observed signal that feeds
--    the trait formulas. event_type is the canonical name from the docs.
CREATE TABLE IF NOT EXISTS public.behavioural_events (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initiative_id   uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  journey_id      uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  journey_item_id uuid REFERENCES public.journey_items(id) ON DELETE SET NULL,
  pillar          text NOT NULL CHECK (pillar IN ('participation','ownership','confidence','meta')),
  event_type      text NOT NULL,
  -- Numeric value used directly by the trait formula. Range varies by trait
  -- (most traits expect 0..1; some are raw counts/seconds/hours and the
  -- aggregator normalises). Always recorded so the audit trail is complete.
  value           numeric NOT NULL DEFAULT 0,
  -- Free-form payload for the rest of the signal (e.g. response_time_ms,
  -- target_response_time_ms, evidence_quality, calibration_pair, hours, etc.)
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavioural_events_user_time
  ON public.behavioural_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioural_events_type_time
  ON public.behavioural_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioural_events_initiative
  ON public.behavioural_events (initiative_id, occurred_at DESC);

ALTER TABLE public.behavioural_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own behavioural events"
  ON public.behavioural_events FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'change_manager'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'team_lead'::app_role)
  );

CREATE POLICY "Anon can read behavioural events (demo)"
  ON public.behavioural_events FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can insert behavioural events"
  ON public.behavioural_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "CM and admins can manage behavioural events"
  ON public.behavioural_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'change_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'change_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));


-- 2. trait_observations: per-user, per-trait persisted decay-weighted value
--    x_i, the scaled s_i, and event count, for the most recent recalculation.
--    This is what the drill-down reads — full audit trail of the maths.
CREATE TABLE IF NOT EXISTS public.trait_observations (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initiative_id   uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  pillar          text NOT NULL CHECK (pillar IN ('participation','ownership','confidence')),
  trait_key       text NOT NULL,            -- e.g. P_x1, O_x6, C_x2
  observed_value  numeric NOT NULL,          -- x_i (decay-weighted)
  scaled_value    numeric NOT NULL,          -- s_i in [-1, 1]
  baseline_mean   numeric NOT NULL,          -- μ_i used
  baseline_sd     numeric NOT NULL,          -- σ_i used
  weight          numeric NOT NULL,          -- w_i used
  event_count     integer NOT NULL DEFAULT 0,
  rolling_window_days integer NOT NULL,
  half_life_days  numeric NOT NULL,
  calculated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, initiative_id, trait_key)
);

CREATE INDEX IF NOT EXISTS idx_trait_obs_user_pillar
  ON public.trait_observations (user_id, pillar);

ALTER TABLE public.trait_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read trait_observations"
  ON public.trait_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read trait_observations"
  ON public.trait_observations FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can manage trait_observations"
  ON public.trait_observations FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 3. behavioural_flags: separate from scores per docs (overload, overconfidence,
--    underconfidence, fragility). Never deducted from pillar scores.
CREATE TABLE IF NOT EXISTS public.behavioural_flags (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initiative_id   uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  flag_type       text NOT NULL,            -- ownership_overload | overconfidence | underconfidence | confidence_volatility | participation_drop_off
  pillar          text,                      -- participation | ownership | confidence | null
  severity        text NOT NULL DEFAULT 'info', -- info | warning | risk
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  active          boolean NOT NULL DEFAULT true,
  raised_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_behavioural_flags_user_active
  ON public.behavioural_flags (user_id, active);

ALTER TABLE public.behavioural_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read behavioural_flags"
  ON public.behavioural_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read behavioural_flags"
  ON public.behavioural_flags FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can manage behavioural_flags"
  ON public.behavioural_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 4. user_capacity: weekly H_journey + H_BAU for ownership overload rule
--    H_journey + H_BAU <= 40 (Ownership doc §9)
CREATE TABLE IF NOT EXISTS public.user_capacity (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start    date NOT NULL,
  h_journey     numeric NOT NULL DEFAULT 0,
  h_bau         numeric NOT NULL DEFAULT 0,
  weekly_limit  numeric NOT NULL DEFAULT 40,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.user_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read user_capacity"
  ON public.user_capacity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read user_capacity"
  ON public.user_capacity FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can manage user_capacity"
  ON public.user_capacity FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 5. Extend scores table to persist progress-scaled dashboard values and
--    capture the per-recalc adoption gap/ideal exactly per the AMP master doc.
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS participation_dashboard numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ownership_dashboard     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_dashboard    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adoption_score_100      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adoption_dashboard      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adoption_ideal          numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adoption_gap            numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_progress           numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase_used              text,
  ADD COLUMN IF NOT EXISTS rolling_window_days     integer,
  ADD COLUMN IF NOT EXISTS half_life_days          numeric;

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS adoption_dashboard      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adoption_ideal          numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_progress           numeric DEFAULT 0;


-- 6. Seed scoring_config rows for documented defaults if absent.
--    All values exactly per the four scoring documents.
INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('phase_weights',
   '{"baseline":{"participation":0.20,"ownership":0.40,"confidence":0.40},"design_build":{"participation":0.35,"ownership":0.35,"confidence":0.30},"training_testing":{"participation":0.20,"ownership":0.40,"confidence":0.40},"post_go_live":{"participation":0.10,"ownership":0.45,"confidence":0.45}}'::jsonb,
   'adoption',
   'Adoption pillar weights — baseline (AMP §9.1) and phase-based (AMP §9.3)')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('decay_settings',
   '{"default_window_days":14,"default_half_life_days":7,"epsilon":0.01,"presets":{"7":{"half_life":4,"label":"Fast — go-live readiness"},"14":{"half_life":7,"label":"Default — moderate"},"30":{"half_life":14,"label":"Slower — long formation windows"}},"baseline_refresh_weeks":10}'::jsonb,
   'engine',
   'Rolling window + half-life decay (Participation §4, Ownership §4, Confidence §4)')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('participation_traits',
   '{"P_x1":{"label":"Content access","weight":0.16,"baseline_mean":0.85,"baseline_sd":0.10,"formula":"N_accessed / N_assigned"},"P_x2":{"label":"Engagement timeliness","weight":0.12,"baseline_mean":0.70,"baseline_sd":0.15,"formula":"1 - min(1, avg_hours_to_first_access / threshold)"},"P_x3":{"label":"Content dwell quality","weight":0.12,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"0.4*dwell_ratio + 0.3*scroll_completion + 0.3*video_completion"},"P_x4":{"label":"Completion coverage","weight":0.16,"baseline_mean":0.80,"baseline_sd":0.12,"formula":"N_completed / N_required"},"P_x5":{"label":"Engagement consistency","weight":0.10,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"D_active / D_eligible"},"P_x6":{"label":"Breadth of engagement","weight":0.08,"baseline_mean":0.60,"baseline_sd":0.15,"formula":"T_engaged / T_assigned"},"P_x7":{"label":"Revisit behaviour","weight":0.07,"baseline_mean":0.35,"baseline_sd":0.15,"formula":"min(1, N_revisited / N_accessed)"},"P_x8":{"label":"Nudge responsiveness","weight":0.07,"baseline_mean":0.55,"baseline_sd":0.20,"formula":"N_completed_after_nudge / N_nudges_sent"},"P_x9":{"label":"Active engagement depth","weight":0.06,"baseline_mean":0.50,"baseline_sd":0.20,"formula":"normalised_interaction_depth_index"},"P_x10":{"label":"Participation continuity","weight":0.06,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"1 - min(1, largest_inactivity_gap / threshold)"}}'::jsonb,
   'participation',
   'Participation traits — verbatim from Participation_Scoring_Algorithm_Framework §6 and §8')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('ownership_traits',
   '{"O_x1":{"label":"Task completion quality","weight":0.16,"baseline_mean":0.75,"baseline_sd":0.10,"formula":"sum(q_k) / N_q"},"O_x2":{"label":"Timeliness of execution","weight":0.14,"baseline_mean":0.70,"baseline_sd":0.15,"formula":"N_ontime / N_assigned"},"O_x3":{"label":"Evidence of application","weight":0.14,"baseline_mean":0.60,"baseline_sd":0.20,"formula":"sum(e_k) / N_e"},"O_x4":{"label":"Improvement over time","weight":0.08,"baseline_mean":0.10,"baseline_sd":0.10,"formula":"normalised slope of attempt scores"},"O_x5":{"label":"Voluntary engagement","weight":0.08,"baseline_mean":0.25,"baseline_sd":0.15,"formula":"N_optional_done / max(N_optional_available,1)"},"O_x6":{"label":"Independence from reminders","weight":0.14,"baseline_mean":0.70,"baseline_sd":0.15,"formula":"1 - N_reminder_completed / max(N_completed,1)"},"O_x7":{"label":"Behavioural consistency","weight":0.10,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"max(0, 1 - σ_c / max(μ_c,ε))"},"O_x8":{"label":"Problem resolution behaviour","weight":0.06,"baseline_mean":0.60,"baseline_sd":0.20,"formula":"N_corrected_failures / max(N_failures,1)"},"O_x9":{"label":"Volunteer as change agent","weight":0.04,"baseline_mean":0.10,"baseline_sd":0.10,"formula":"N_change_agent_acts / opportunities"},"O_x10":{"label":"Teamwork","weight":0.03,"baseline_mean":0.55,"baseline_sd":0.20,"formula":"team contribution score"},"O_x11":{"label":"Voluntary insights","weight":0.03,"baseline_mean":0.15,"baseline_sd":0.10,"formula":"N_insights / opportunities"}}'::jsonb,
   'ownership',
   'Ownership traits — verbatim from Ownership_Scoring_Algorithm_Framework §6 and §8')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('confidence_traits',
   '{"C_x1":{"label":"Self-rated readiness","weight":0.10,"baseline_mean":0.70,"baseline_sd":0.15,"formula":"self_rated / max_rating"},"C_x2":{"label":"Calibration accuracy","weight":0.18,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"1 - |confidence - performance|"},"C_x3":{"label":"Response decisiveness","weight":0.08,"baseline_mean":0.60,"baseline_sd":0.20,"formula":"1 - min(1, response_time / target_response_time)"},"C_x4":{"label":"Confidence stability","weight":0.12,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"1 - normStdDev(confidence over time)"},"C_x5":{"label":"Scenario performance confidence","weight":0.18,"baseline_mean":0.60,"baseline_sd":0.20,"formula":"scenario_confidence * scenario_performance"},"C_x6":{"label":"Recovery after mistakes","weight":0.08,"baseline_mean":0.55,"baseline_sd":0.20,"formula":"successful_recoveries / recovery_opportunities"},"C_x7":{"label":"Help dependency (inverse)","weight":0.10,"baseline_mean":0.65,"baseline_sd":0.15,"formula":"1 - help_requests / task_attempts"},"C_x8":{"label":"Confidence growth","weight":0.08,"baseline_mean":0.10,"baseline_sd":0.10,"formula":"(latest - initial) / max_rating"},"C_x9":{"label":"Advanced task participation","weight":0.04,"baseline_mean":0.20,"baseline_sd":0.15,"formula":"advanced_attempted / advanced_offered"},"C_x10":{"label":"Training volunteering","weight":0.04,"baseline_mean":0.10,"baseline_sd":0.10,"formula":"volunteer_instances / training_opportunities"}}'::jsonb,
   'confidence',
   'Confidence traits — verbatim from Confidence_Scoring_Algorithm_Framework §6 and §8')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('adoption_target',
   '{"A_target":85,"weighting_mode":"baseline","epsilon":0.01}'::jsonb,
   'adoption',
   'A_target = admin-set ideal final adoption (AMP §9.5). weighting_mode = baseline | phase')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('participation_safeguards',
   '{"raw_clicks_dominate":false,"normalise_dwell_by_content_type":true,"penalise_efficient_speed":false,"separate_from_ownership":true,"first_access_threshold_hours":48,"inactivity_threshold_days":7}'::jsonb,
   'participation',
   'Participation safeguards (§11) — operational thresholds used by trait formulas')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

INSERT INTO public.scoring_config (config_key, config_value, category, description)
VALUES
  ('confidence_flags',
   '{"overconfidence_threshold":0.30,"underconfidence_threshold":-0.30,"volatility_threshold":0.25}'::jsonb,
   'confidence',
   'Confidence flag thresholds (§10) — surfaced separately, not deducted from score')
ON CONFLICT (config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value,
      description  = EXCLUDED.description;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_user_capacity_updated ON public.user_capacity;
CREATE TRIGGER trg_user_capacity_updated
  BEFORE UPDATE ON public.user_capacity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();