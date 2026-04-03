/**
 * AMP Unified Scoring Algorithm Framework
 * 
 * Implements the unified practical technical model specification for
 * Participation, Ownership, Confidence, and composite Adoption.
 * 
 * CRITICAL MODELLING RULE:
 * Duration-based progression is applied only to the Participation, Ownership,
 * and Confidence pillar metrics. The Adoption layer combines the final pillar
 * outputs and must NOT apply a second duration factor.
 * 
 * Core formulas (Section 3):
 *   Decay-weighted trait:  X_i = Σ(x_i,e × d_e) / Σ(d_e)
 *   Event-level decay:     d_e = exp(-λ × a_e)
 *   Coefficient of var:    CV_i = σ_i / max(μ_i, ε)
 *   Scaled trait score:    S_i = (X_i - μ_i) / (σ_i × (1 + CV_i) + ε)
 *   Raw pillar score:      RawPillar = Σ(S_i × w_i)
 *   Dashboard pillar:      DispPillar = max(0, min(100, 50 + 25 × RawPillar))
 * 
 * Duration (Section 4):
 *   TP(t) = min(ElapsedDuration(t) / TotalPlannedDuration, 1)
 *   IdealPillarProg(t)  = IdealPillarTarget × TP(t)
 *   ActualPillarProg(t) = (DispPillar(t) / 100) × TP(t)
 * 
 * Adoption (Section 8):
 *   A_dash = (w_P × P_n) + (w_O × O_n) + (w_C × C_n)   [P_n = P_disp/100]
 *   A_prog = (w_P × P_p) + (w_O × O_p) + (w_C × C_p)   [P_p = P_prog(t)]
 *   !! A_prog must NOT be multiplied by TP(t) again !!
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

// ─── Default Config (Unified Framework, Sections 5-8) ───────────

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  // Section 8.3: Baseline composite weights
  // Section 8.4: Optional phase-based weight variants
  phase_weights: {
    default:          { participation: 0.20, ownership: 0.40, confidence: 0.40 },
    design_build:     { participation: 0.35, ownership: 0.35, confidence: 0.30 },
    training_testing: { participation: 0.20, ownership: 0.40, confidence: 0.40 },
    post_go_live:     { participation: 0.10, ownership: 0.45, confidence: 0.45 },
  },

  decay_settings: {
    default_window_days: 14,
    default_half_life_days: 7,
    presets: {
      '7':  { half_life: 4,  label: 'Fast (Go-live readiness)' },
      '14': { half_life: 7,  label: 'Moderate (Default tracking)' },
      '30': { half_life: 14, label: 'Slower (Longer formation windows)' },
    },
  },

  // Section 5.2 + 5.3: Participation traits
  participation_traits: {
    P_CA: { weight: 0.16, label: 'Content Access',           baseline_mean: 0.85, baseline_sd: 0.10 },
    P_ET: { weight: 0.12, label: 'Engagement Timeliness',    baseline_mean: 0.70, baseline_sd: 0.15 },
    P_DQ: { weight: 0.12, label: 'Content Dwell Quality',    baseline_mean: 0.65, baseline_sd: 0.15 },
    P_CC: { weight: 0.16, label: 'Completion Coverage',      baseline_mean: 0.80, baseline_sd: 0.12 },
    P_EC: { weight: 0.10, label: 'Engagement Consistency',   baseline_mean: 0.65, baseline_sd: 0.15 },
    P_BE: { weight: 0.08, label: 'Breadth of Engagement',    baseline_mean: 0.60, baseline_sd: 0.15 },
    P_RB: { weight: 0.07, label: 'Revisit Behaviour',        baseline_mean: 0.35, baseline_sd: 0.15 },
    P_NR: { weight: 0.07, label: 'Nudge Responsiveness',     baseline_mean: 0.55, baseline_sd: 0.20 },
    P_AE: { weight: 0.06, label: 'Active Engagement Depth',  baseline_mean: 0.50, baseline_sd: 0.20 },
    P_PC: { weight: 0.06, label: 'Participation Continuity', baseline_mean: 0.65, baseline_sd: 0.15 },
  },

  // Section 6.2 + 6.3: Ownership traits
  ownership_traits: {
    O_QQ: { weight: 0.16, label: 'Task Completion Quality',     baseline_mean: 0.75, baseline_sd: 0.10 },
    O_TE: { weight: 0.14, label: 'Timeliness of Execution',     baseline_mean: 0.70, baseline_sd: 0.15 },
    O_EA: { weight: 0.14, label: 'Evidence of Application',     baseline_mean: 0.60, baseline_sd: 0.20 },
    O_IT: { weight: 0.08, label: 'Improvement Over Time',       baseline_mean: 0.10, baseline_sd: 0.10 },
    O_VE: { weight: 0.08, label: 'Voluntary Engagement',        baseline_mean: 0.25, baseline_sd: 0.15 },
    O_IR: { weight: 0.14, label: 'Independence from Reminders', baseline_mean: 0.70, baseline_sd: 0.15 },
    O_BC: { weight: 0.10, label: 'Behavioural Consistency',     baseline_mean: 0.65, baseline_sd: 0.15 },
    O_PR: { weight: 0.06, label: 'Problem Resolution',          baseline_mean: 0.60, baseline_sd: 0.20 },
    O_VC: { weight: 0.04, label: 'Volunteer as Change Agent',   baseline_mean: 0.10, baseline_sd: 0.10 },
    O_TW: { weight: 0.03, label: 'Teamwork',                    baseline_mean: 0.55, baseline_sd: 0.20 },
    O_VI: { weight: 0.03, label: 'Voluntary Insights',          baseline_mean: 0.15, baseline_sd: 0.10 },
  },

  // Section 7.2 + 7.3: Confidence traits
  confidence_traits: {
    C_SR: { weight: 0.10, label: 'Self-Rated Readiness',          baseline_mean: 0.70, baseline_sd: 0.15 },
    C_CA: { weight: 0.18, label: 'Calibration Accuracy',          baseline_mean: 0.65, baseline_sd: 0.15 },
    C_RD: { weight: 0.08, label: 'Response Decisiveness',         baseline_mean: 0.60, baseline_sd: 0.20 },
    C_CS: { weight: 0.12, label: 'Confidence Stability',          baseline_mean: 0.65, baseline_sd: 0.15 },
    C_SC: { weight: 0.18, label: 'Scenario Performance',          baseline_mean: 0.60, baseline_sd: 0.20 },
    C_RF: { weight: 0.08, label: 'Recovery After Mistakes',       baseline_mean: 0.55, baseline_sd: 0.20 },
    C_HD: { weight: 0.10, label: 'Help Dependency (inverse)',     baseline_mean: 0.65, baseline_sd: 0.15 },
    C_CG: { weight: 0.08, label: 'Confidence Growth',             baseline_mean: 0.10, baseline_sd: 0.10 },
    C_AT: { weight: 0.04, label: 'Advanced Task Participation',   baseline_mean: 0.20, baseline_sd: 0.15 },
    C_TV: { weight: 0.04, label: 'Training Volunteering',         baseline_mean: 0.10, baseline_sd: 0.10 },
  },

  // Section 5.4, 7.4: Negative signal layers
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

  // Score interpretation bands
  score_bands: {
    '0-20':  { label: 'Materially Below', color: 'destructive', raw_range: '-1.00 to -0.60' },
    '21-40': { label: 'Below Expected',   color: 'warning',     raw_range: '-0.59 to -0.20' },
    '41-59': { label: 'Baseline',         color: 'info',        raw_range: '-0.19 to 0.19' },
    '60-79': { label: 'Above Expected',   color: 'success',     raw_range: '0.20 to 0.59' },
    '80-100':{ label: 'Strong',           color: 'success',     raw_range: '0.60 to 1.00' },
  },
};

// ─── Shared Mathematical Foundation (Section 3) ─────────────────

const EPSILON = 0.01;

/** Decay rate: λ = ln(2) / half_life_days */
export function decayRate(halfLifeDays: number): number {
  return Math.LN2 / halfLifeDays;
}

/** Event-level decay: d_e = exp(-λ × a_e) */
export function decayWeight(ageDays: number, lambda: number): number {
  return Math.exp(-lambda * ageDays);
}

/**
 * Decay-weighted trait value (Section 3 step 1-2):
 * X_i = Σ(x_i,e × d_e) / Σ(d_e)
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
 * Scale trait value relative to baseline (Section 3 step 3):
 * CV_i = σ_i / max(μ_i, ε)
 * S_i = (X_i - μ_i) / (σ_i × (1 + CV_i) + ε)
 */
export function scaleTraitValue(
  observedValue: number,
  baselineMean: number,
  baselineSd: number
): number {
  const cv = baselineSd / Math.max(baselineMean, EPSILON);
  const denominator = baselineSd * (1 + cv) + EPSILON;
  return (observedValue - baselineMean) / denominator;
}

/**
 * Raw pillar score (Section 3 step 4):
 * RawPillar = Σ(S_i × w_i)
 */
export function rawDimensionScore(
  scaledTraits: { scaled: number; weight: number }[]
): number {
  return scaledTraits.reduce((sum, t) => sum + t.weight * t.scaled, 0);
}

/**
 * Dashboard pillar score (Section 3 step 5):
 * DispPillar = max(0, min(100, 50 + 25 × RawPillar))
 */
export function dashboardScore(rawScore: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + 25 * rawScore)));
}

// ─── Duration-Based Progression (Section 4) ─────────────────────

/**
 * Time Progress Ratio: TP(t) = min(ElapsedDuration(t) / TotalPlannedDuration, 1)
 */
export function durationProgressRatio(
  scoringDate: Date,
  startDate: Date,
  endDate: Date
): number {
  const total = endDate.getTime() - startDate.getTime();
  if (total <= 0) return 1;
  const elapsed = scoringDate.getTime() - startDate.getTime();
  if (elapsed <= 0) return 0;
  return Math.min(elapsed / total, 1);
}

/**
 * Ideal pillar progression: IdealPillarProg(t) = IdealPillarTarget × TP(t)
 */
export function idealPillarProgression(idealPillarTarget: number, tp: number): number {
  return idealPillarTarget * tp;
}

/**
 * Actual pillar progression: ActualPillarProg(t) = (DispPillar / 100) × TP(t)
 */
export function pillarProgression(pillarDashScore: number, tp: number): number {
  return (pillarDashScore / 100) * tp;
}

// ─── Composite Adoption (Section 8) ─────────────────────────────

/**
 * Dashboard Adoption (Section 8.2 Option A):
 * A_dash = (w_P × P_n) + (w_O × O_n) + (w_C × C_n)
 * where P_n = P_disp / 100, etc.
 * 
 * Returns value on 0–100 scale.
 * NO duration factor applied here — pillar outputs are already final.
 */
export function dashboardAdoption(
  participationDisp: number,
  ownershipDisp: number,
  confidenceDisp: number,
  phase: string,
  phaseWeights: Record<string, PhaseWeights>
): number {
  const weights = phaseWeights[phase] || phaseWeights['default'] || phaseWeights['training_testing'] || {
    participation: 0.20, ownership: 0.40, confidence: 0.40,
  };
  const pn = participationDisp / 100;
  const on = ownershipDisp / 100;
  const cn = confidenceDisp / 100;
  return Math.round(((pn * weights.participation) + (on * weights.ownership) + (cn * weights.confidence)) * 100);
}

/**
 * Progressed Adoption (Section 8.2 Option B):
 * A_prog = (w_P × P_prog) + (w_O × O_prog) + (w_C × C_prog)
 * 
 * Because each P_prog already includes TP(t), this must NOT be
 * multiplied by TP(t) again.
 * 
 * Returns value on 0–1 scale.
 */
export function progressedAdoption(
  pProg: number,
  oProg: number,
  cProg: number,
  phase: string,
  phaseWeights: Record<string, PhaseWeights>
): number {
  const weights = phaseWeights[phase] || phaseWeights['default'] || {
    participation: 0.20, ownership: 0.40, confidence: 0.40,
  };
  return (pProg * weights.participation) + (oProg * weights.ownership) + (cProg * weights.confidence);
}

/**
 * Ideal Progressed Adoption: I_prog(t) = I_target × TP(t)
 */
export function idealProgressedAdoption(idealTarget: number, tp: number): number {
  return idealTarget * tp;
}

/**
 * Adoption Gap: Gap(t) = A_prog(t) - I_prog(t)
 */
export function adoptionGap(aProg: number, iProg: number): number {
  return aProg - iProg;
}

// ─── Legacy / backward-compatible aliases ───────────────────────

/** Alias for dashboardAdoption — used by useSupabaseData helpers */
export function adoptionScore(
  participation: number,
  ownership: number,
  confidence: number,
  phase: string,
  phaseWeights: Record<string, PhaseWeights>
): number {
  return dashboardAdoption(participation, ownership, confidence, phase, phaseWeights);
}

/** Alias kept for backward compat */
export function behaviouralReadiness(
  participation: number,
  ownership: number,
  confidence: number,
  phase: string,
  phaseWeights: Record<string, PhaseWeights>
): number {
  return dashboardAdoption(participation, ownership, confidence, phase, phaseWeights) / 100;
}

// ─── Utility Functions ──────────────────────────────────────────

/**
 * Calculate a full dimension score from trait observations.
 */
export function calculateDimensionScore(
  traitObservations: Record<string, number>,
  traitConfig: Record<string, TraitConfig>,
  _lambda: number
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
 * Score interpretation band (Section 8.5)
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
