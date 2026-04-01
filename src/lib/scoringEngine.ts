/**
 * AMP Behavioural Adoption Scoring Engine
 * 
 * Implements the scoring framework from:
 * - AMP Behavioural Adoption Scoring Model
 * - Participation Scoring Algorithm Framework
 * - Ownership Scoring Algorithm Framework
 * - Confidence Scoring Algorithm Framework
 * 
 * Core formulas:
 *   Decay:      d_e = e^(-λ * age_days)
 *   λ:          ln(2) / half_life_days
 *   Trait:      X_i = Σ(x_ie * d_e) / Σ(d_e)
 *   Scaled:     S_i = clip((X_i - μ_i) / ((1 + CV_i) * σ_i), -1, 1)
 *   CV:         σ_i / max(μ_i, ε)
 *   Raw:        Score_raw = Σ(w_i * S_i)
 *   Dashboard:  Score_100 = 50 * (Score_raw + 1)
 *   Adoption:   A = P*w_p + O*w_o + C*w_c (phase-weighted)
 */

// ─── Types ──────────────────────────────────────────────────────
export interface TraitConfig {
  weight: number;
  label: string;
  baseline_mean: number;
  baseline_sd: number;
}

export interface PhaseWeights {
  participation: number;
  ownership: number;
  confidence: number;
}

export interface DecaySettings {
  default_window_days: number;
  default_half_life_days: number;
  presets: Record<string, { half_life: number; label: string }>;
}

export interface ScoringConfig {
  phase_weights: Record<string, PhaseWeights>;
  decay_settings: DecaySettings;
  participation_traits: Record<string, TraitConfig>;
  ownership_traits: Record<string, TraitConfig>;
  confidence_traits: Record<string, TraitConfig>;
  negative_signals: {
    participation: Record<string, number>;
    confidence: Record<string, number>;
  };
  score_bands: Record<string, { label: string; color: string; raw_range: string }>;
}

// ─── Default Config (matches framework documents) ───────────────
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  phase_weights: {
    design_build: { participation: 0.35, ownership: 0.35, confidence: 0.30 },
    training_testing: { participation: 0.20, ownership: 0.40, confidence: 0.40 },
    post_go_live: { participation: 0.10, ownership: 0.45, confidence: 0.45 },
  },
  decay_settings: {
    default_window_days: 14,
    default_half_life_days: 7,
    presets: {
      '7': { half_life: 4, label: 'Fast (Go-live readiness)' },
      '14': { half_life: 7, label: 'Moderate (Default tracking)' },
      '30': { half_life: 14, label: 'Slower (Longer formation windows)' },
    },
  },
  participation_traits: {
    P_CA: { weight: 0.16, label: 'Content Access', baseline_mean: 0.85, baseline_sd: 0.10 },
    P_ET: { weight: 0.12, label: 'Engagement Timeliness', baseline_mean: 0.70, baseline_sd: 0.15 },
    P_DQ: { weight: 0.12, label: 'Content Dwell Quality', baseline_mean: 0.65, baseline_sd: 0.15 },
    P_CC: { weight: 0.16, label: 'Completion Coverage', baseline_mean: 0.75, baseline_sd: 0.10 },
    P_EC: { weight: 0.10, label: 'Engagement Consistency', baseline_mean: 0.65, baseline_sd: 0.15 },
    P_BE: { weight: 0.08, label: 'Breadth of Engagement', baseline_mean: 0.70, baseline_sd: 0.15 },
    P_RB: { weight: 0.07, label: 'Revisit Behaviour', baseline_mean: 0.30, baseline_sd: 0.15 },
    P_NR: { weight: 0.07, label: 'Nudge Responsiveness', baseline_mean: 0.60, baseline_sd: 0.20 },
    P_AE: { weight: 0.06, label: 'Active Engagement Depth', baseline_mean: 0.55, baseline_sd: 0.20 },
    P_PC: { weight: 0.06, label: 'Participation Continuity', baseline_mean: 0.70, baseline_sd: 0.15 },
  },
  ownership_traits: {
    O_TCQ: { weight: 0.16, label: 'Task Completion Quality', baseline_mean: 0.75, baseline_sd: 0.10 },
    O_TE: { weight: 0.14, label: 'Timeliness of Execution', baseline_mean: 0.70, baseline_sd: 0.15 },
    O_EA: { weight: 0.14, label: 'Evidence of Application', baseline_mean: 0.60, baseline_sd: 0.20 },
    O_IT: { weight: 0.08, label: 'Improvement Over Time', baseline_mean: 0.10, baseline_sd: 0.10 },
    O_VE: { weight: 0.08, label: 'Voluntary Engagement', baseline_mean: 0.25, baseline_sd: 0.15 },
    O_IR: { weight: 0.14, label: 'Independence from Reminders', baseline_mean: 0.70, baseline_sd: 0.15 },
    O_BC: { weight: 0.10, label: 'Behavioural Consistency', baseline_mean: 0.65, baseline_sd: 0.15 },
    O_PR: { weight: 0.06, label: 'Problem Resolution', baseline_mean: 0.50, baseline_sd: 0.20 },
    O_VCA: { weight: 0.04, label: 'Volunteer as Change Agent', baseline_mean: 0.20, baseline_sd: 0.15 },
    O_TW: { weight: 0.03, label: 'Teamwork', baseline_mean: 0.50, baseline_sd: 0.20 },
    O_VI: { weight: 0.03, label: 'Voluntary Insights', baseline_mean: 0.20, baseline_sd: 0.15 },
  },
  confidence_traits: {
    C_SR: { weight: 0.10, label: 'Self-Rated Readiness', baseline_mean: 0.70, baseline_sd: 0.15 },
    C_CA: { weight: 0.18, label: 'Calibration Accuracy', baseline_mean: 0.65, baseline_sd: 0.15 },
    C_RD: { weight: 0.08, label: 'Response Decisiveness', baseline_mean: 0.60, baseline_sd: 0.20 },
    C_CS: { weight: 0.12, label: 'Confidence Stability', baseline_mean: 0.65, baseline_sd: 0.15 },
    C_SC: { weight: 0.18, label: 'Scenario Performance', baseline_mean: 0.60, baseline_sd: 0.20 },
    C_RM: { weight: 0.08, label: 'Recovery After Mistakes', baseline_mean: 0.55, baseline_sd: 0.20 },
    C_HD: { weight: 0.10, label: 'Help Dependency (inverse)', baseline_mean: 0.65, baseline_sd: 0.15 },
    C_CG: { weight: 0.08, label: 'Confidence Growth', baseline_mean: 0.10, baseline_sd: 0.10 },
    C_AT: { weight: 0.04, label: 'Advanced Task Participation', baseline_mean: 0.25, baseline_sd: 0.15 },
    C_TV: { weight: 0.04, label: 'Training Volunteering', baseline_mean: 0.15, baseline_sd: 0.10 },
  },
  negative_signals: {
    participation: {
      superficial_dwell_weight: 0.25,
      late_completion_weight: 0.25,
      repeated_reminders_weight: 0.25,
      partial_completion_weight: 0.25,
    },
    confidence: {
      overconfidence_alpha: 0.5,
      hidden_capability_beta: 0.2,
      volatility_gamma: 0.3,
    },
  },
  score_bands: {
    '0-20': { label: 'Materially Below', color: 'destructive', raw_range: '-1.00 to -0.60' },
    '21-40': { label: 'Below Expected', color: 'warning', raw_range: '-0.59 to -0.20' },
    '41-59': { label: 'Baseline', color: 'info', raw_range: '-0.19 to 0.19' },
    '60-79': { label: 'Above Expected', color: 'success', raw_range: '0.20 to 0.59' },
    '80-100': { label: 'Strong', color: 'success', raw_range: '0.60 to 1.00' },
  },
};

// ─── Core Math Functions ────────────────────────────────────────

const EPSILON = 0.01;

/** Calculate decay rate λ from half-life: λ = ln(2) / h */
export function decayRate(halfLifeDays: number): number {
  return Math.LN2 / halfLifeDays;
}

/** Calculate decay weight for an event: d_e = e^(-λ * age_days) */
export function decayWeight(ageDays: number, lambda: number): number {
  return Math.exp(-lambda * ageDays);
}

/** Clip value to [-1, 1] range */
function clip(value: number, min = -1, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** 
 * Calculate decay-weighted trait value
 * X_i = Σ(x_ie * d_e) / Σ(d_e)
 */
export function decayWeightedTrait(
  events: { value: number; ageDays: number }[],
  lambda: number
): number {
  if (events.length === 0) return 0;
  let numerator = 0;
  let denominator = 0;
  for (const e of events) {
    const d = decayWeight(e.ageDays, lambda);
    numerator += e.value * d;
    denominator += d;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Scale a trait value relative to baseline
 * S_i = clip((X_i - μ_i) / ((1 + CV_i) * σ_i), -1, 1)
 * CV_i = σ_i / max(μ_i, ε)
 */
export function scaleTraitValue(
  observedValue: number,
  baselineMean: number,
  baselineSd: number
): number {
  const cv = baselineSd / Math.max(baselineMean, EPSILON);
  const denominator = (1 + cv) * baselineSd + EPSILON;
  return clip((observedValue - baselineMean) / denominator);
}

/**
 * Calculate raw dimension score from scaled traits
 * Score_raw = Σ(w_i * S_i)
 */
export function rawDimensionScore(
  scaledTraits: { scaled: number; weight: number }[]
): number {
  return scaledTraits.reduce((sum, t) => sum + t.weight * t.scaled, 0);
}

/**
 * Convert raw score [-1, 1] to dashboard score [0, 100]
 * Score_100 = 50 * (Score_raw + 1)
 */
export function dashboardScore(rawScore: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 * (rawScore + 1))));
}

/**
 * Calculate adoption score from P, O, C dimension scores
 * using phase-specific weights
 */
export function adoptionScore(
  participation: number,
  ownership: number,
  confidence: number,
  phase: string,
  phaseWeights: Record<string, PhaseWeights>
): number {
  const weights = phaseWeights[phase] || phaseWeights['training_testing'] || {
    participation: 0.20, ownership: 0.40, confidence: 0.40,
  };
  return Math.round(
    participation * weights.participation +
    ownership * weights.ownership +
    confidence * weights.confidence
  );
}

/**
 * Calculate a full dimension score from trait observations
 */
export function calculateDimensionScore(
  traitObservations: Record<string, number>,
  traitConfig: Record<string, TraitConfig>,
  lambda: number
): { dashboard: number; raw: number; traitDetails: Record<string, { observed: number; scaled: number; weight: number }> } {
  const traitDetails: Record<string, { observed: number; scaled: number; weight: number }> = {};
  const scaledTraits: { scaled: number; weight: number }[] = [];

  for (const [key, config] of Object.entries(traitConfig)) {
    const observed = traitObservations[key] ?? config.baseline_mean;
    const scaled = scaleTraitValue(observed, config.baseline_mean, config.baseline_sd);
    traitDetails[key] = { observed, scaled, weight: config.weight };
    scaledTraits.push({ scaled, weight: config.weight });
  }

  const raw = rawDimensionScore(scaledTraits);
  const dashboard = dashboardScore(raw);

  return { dashboard, raw, traitDetails };
}

/**
 * Get score interpretation band
 */
export function getScoreBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Strong', color: 'amp-success' };
  if (score >= 60) return { label: 'Above Expected', color: 'amp-info' };
  if (score >= 41) return { label: 'Baseline', color: 'amp-warning' };
  if (score >= 21) return { label: 'Below Expected', color: 'amp-risk' };
  return { label: 'Materially Below', color: 'destructive' };
}

/**
 * Validate that trait weights sum to 1.0 (within tolerance)
 */
export function validateWeights(traits: Record<string, TraitConfig>): { valid: boolean; sum: number } {
  const sum = Object.values(traits).reduce((s, t) => s + t.weight, 0);
  return { valid: Math.abs(sum - 1.0) < 0.01, sum: Math.round(sum * 100) / 100 };
}
