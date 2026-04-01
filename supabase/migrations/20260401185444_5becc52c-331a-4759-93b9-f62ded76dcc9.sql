
CREATE TABLE public.scoring_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scoring_config" ON public.scoring_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can manage scoring_config" ON public.scoring_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default scoring configuration from framework documents

-- Phase weights (Section 9 of AMP Model)
INSERT INTO public.scoring_config (config_key, config_value, category, description) VALUES
('phase_weights', '{
  "design_build": {"participation": 0.35, "ownership": 0.35, "confidence": 0.30},
  "training_testing": {"participation": 0.20, "ownership": 0.40, "confidence": 0.40},
  "post_go_live": {"participation": 0.10, "ownership": 0.45, "confidence": 0.45}
}'::jsonb, 'adoption', 'Phase-based dimension weights for adoption score calculation'),

-- Rolling window & decay settings
('decay_settings', '{
  "default_window_days": 14,
  "default_half_life_days": 7,
  "presets": {
    "7": {"half_life": 4, "label": "Fast (Go-live readiness)"},
    "14": {"half_life": 7, "label": "Moderate (Default tracking)"},
    "30": {"half_life": 14, "label": "Slower (Longer formation windows)"}
  }
}'::jsonb, 'decay', 'Rolling window and decay rate configuration'),

-- Participation trait weights (Section 8 of Participation Framework)
('participation_traits', '{
  "P_CA": {"weight": 0.16, "label": "Content Access", "baseline_mean": 0.85, "baseline_sd": 0.10},
  "P_ET": {"weight": 0.12, "label": "Engagement Timeliness", "baseline_mean": 0.70, "baseline_sd": 0.15},
  "P_DQ": {"weight": 0.12, "label": "Content Dwell Quality", "baseline_mean": 0.65, "baseline_sd": 0.15},
  "P_CC": {"weight": 0.16, "label": "Completion Coverage", "baseline_mean": 0.75, "baseline_sd": 0.10},
  "P_EC": {"weight": 0.10, "label": "Engagement Consistency", "baseline_mean": 0.65, "baseline_sd": 0.15},
  "P_BE": {"weight": 0.08, "label": "Breadth of Engagement", "baseline_mean": 0.70, "baseline_sd": 0.15},
  "P_RB": {"weight": 0.07, "label": "Revisit Behaviour", "baseline_mean": 0.30, "baseline_sd": 0.15},
  "P_NR": {"weight": 0.07, "label": "Nudge Responsiveness", "baseline_mean": 0.60, "baseline_sd": 0.20},
  "P_AE": {"weight": 0.06, "label": "Active Engagement Depth", "baseline_mean": 0.55, "baseline_sd": 0.20},
  "P_PC": {"weight": 0.06, "label": "Participation Continuity", "baseline_mean": 0.70, "baseline_sd": 0.15}
}'::jsonb, 'participation', 'Participation dimension trait weights and baselines'),

-- Ownership trait weights (Section 8 of Ownership Framework)
('ownership_traits', '{
  "O_TCQ": {"weight": 0.16, "label": "Task Completion Quality", "baseline_mean": 0.75, "baseline_sd": 0.10},
  "O_TE": {"weight": 0.14, "label": "Timeliness of Execution", "baseline_mean": 0.70, "baseline_sd": 0.15},
  "O_EA": {"weight": 0.14, "label": "Evidence of Application", "baseline_mean": 0.60, "baseline_sd": 0.20},
  "O_IT": {"weight": 0.08, "label": "Improvement Over Time", "baseline_mean": 0.10, "baseline_sd": 0.10},
  "O_VE": {"weight": 0.08, "label": "Voluntary Engagement", "baseline_mean": 0.25, "baseline_sd": 0.15},
  "O_IR": {"weight": 0.14, "label": "Independence from Reminders", "baseline_mean": 0.70, "baseline_sd": 0.15},
  "O_BC": {"weight": 0.10, "label": "Behavioural Consistency", "baseline_mean": 0.65, "baseline_sd": 0.15},
  "O_PR": {"weight": 0.06, "label": "Problem Resolution", "baseline_mean": 0.50, "baseline_sd": 0.20},
  "O_VCA": {"weight": 0.04, "label": "Volunteer as Change Agent", "baseline_mean": 0.20, "baseline_sd": 0.15},
  "O_TW": {"weight": 0.03, "label": "Teamwork", "baseline_mean": 0.50, "baseline_sd": 0.20},
  "O_VI": {"weight": 0.03, "label": "Voluntary Insights", "baseline_mean": 0.20, "baseline_sd": 0.15}
}'::jsonb, 'ownership', 'Ownership dimension trait weights and baselines'),

-- Confidence trait weights (Section 8 of Confidence Framework)
('confidence_traits', '{
  "C_SR": {"weight": 0.10, "label": "Self-Rated Readiness", "baseline_mean": 0.70, "baseline_sd": 0.15},
  "C_CA": {"weight": 0.18, "label": "Calibration Accuracy", "baseline_mean": 0.65, "baseline_sd": 0.15},
  "C_RD": {"weight": 0.08, "label": "Response Decisiveness", "baseline_mean": 0.60, "baseline_sd": 0.20},
  "C_CS": {"weight": 0.12, "label": "Confidence Stability", "baseline_mean": 0.65, "baseline_sd": 0.15},
  "C_SC": {"weight": 0.18, "label": "Scenario Performance", "baseline_mean": 0.60, "baseline_sd": 0.20},
  "C_RM": {"weight": 0.08, "label": "Recovery After Mistakes", "baseline_mean": 0.55, "baseline_sd": 0.20},
  "C_HD": {"weight": 0.10, "label": "Help Dependency (inverse)", "baseline_mean": 0.65, "baseline_sd": 0.15},
  "C_CG": {"weight": 0.08, "label": "Confidence Growth", "baseline_mean": 0.10, "baseline_sd": 0.10},
  "C_AT": {"weight": 0.04, "label": "Advanced Task Participation", "baseline_mean": 0.25, "baseline_sd": 0.15},
  "C_TV": {"weight": 0.04, "label": "Training Volunteering", "baseline_mean": 0.15, "baseline_sd": 0.10}
}'::jsonb, 'confidence', 'Confidence dimension trait weights and baselines'),

-- Score interpretation bands
('score_bands', '{
  "0-20": {"label": "Materially Below", "color": "destructive", "raw_range": "-1.00 to -0.60"},
  "21-40": {"label": "Below Expected", "color": "warning", "raw_range": "-0.59 to -0.20"},
  "41-59": {"label": "Baseline", "color": "info", "raw_range": "-0.19 to 0.19"},
  "60-79": {"label": "Above Expected", "color": "success", "raw_range": "0.20 to 0.59"},
  "80-100": {"label": "Strong", "color": "success", "raw_range": "0.60 to 1.00"}
}'::jsonb, 'interpretation', 'Score interpretation bands for dashboard display'),

-- Negative signal penalty weights
('negative_signals', '{
  "participation": {
    "superficial_dwell_weight": 0.25,
    "late_completion_weight": 0.25,
    "repeated_reminders_weight": 0.25,
    "partial_completion_weight": 0.25
  },
  "confidence": {
    "overconfidence_alpha": 0.5,
    "hidden_capability_beta": 0.2,
    "volatility_gamma": 0.3
  }
}'::jsonb, 'penalties', 'Negative signal penalty weights for P and C dimensions');
