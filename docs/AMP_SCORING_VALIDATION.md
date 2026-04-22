# AMP Scoring Engine — Implementation Validation Report

This document maps every implemented formula, weight, and behaviour back to the
four AMP source documents and shows where the code lives.

> Source documents (single source of truth):
> 1. AMP Behavioural Adoption Scoring Model (master)
> 2. Participation Scoring Algorithm Framework
> 3. Ownership Scoring Algorithm Framework
> 4. Confidence Scoring Algorithm Framework

---

## 1. Verbatim formula implementation

| # | Formula (master doc) | Code location |
|---|----------------------|---------------|
| 1 | Decay weight `d_j = e^(-λ · Δt_j)` | `supabase/functions/score-recalc/index.ts → decayWeight()` |
| 2 | Decay-weighted trait `x_i = Σ(v_ij · d_j) / Σ(d_j)` | `score-recalc/index.ts → weightedMean()` |
| 3 | Coefficient of variation `CV_i = σ_i / max(μ_i, ε)` | `score-recalc/index.ts → scaleTrait()` |
| 4 | Scaled trait `s_i = clip((x_i − μ_i) / ((1 + CV_i) · σ_i), −1, 1)` | `score-recalc/index.ts → scaleTrait()` and `src/lib/scoringEngine.ts → scaleTraitValue()` |
| 5 | Raw pillar `P/O/C = Σ(w_i · s_i)` | `score-recalc/index.ts → computePillar()` |
| 6 | Convert to 0–100 `PillarScore100 = 50 · (Raw + 1)` | `score-recalc/index.ts → toScore100()` and `src/lib/scoringEngine.ts → rawToScore100()` |
| 7 | Time progress `p = clip((t − t_start) / (t_end − t_start), 0, 1)` | `score-recalc/index.ts → timeProgress()` |
| 8 | Dashboard pillar `Pillar_dashboard = PillarScore100 · p` | `score-recalc/index.ts` (writes `*_dashboard` columns) |
| 9 | Adoption `A100 = P·wP + O·wO + C·wC` | `score-recalc/index.ts → adoption100()` and `src/lib/scoringEngine.ts → adoptionScore()` |
| 10 | Dashboard adoption `A_dashboard = A100 · p` | `score-recalc/index.ts` (writes `adoption_dashboard`) |
| 11 | Ideal adoption `A_ideal = A_target · p` | `score-recalc/index.ts → adoptionIdeal()` |
| 12 | Adoption gap `A_dashboard − A_ideal` | `score-recalc/index.ts` (writes `adoption_gap`) |

No formula has been simplified, substituted, or inlined with magic numbers.

---

## 2. Weights & baselines — document-to-row mapping

All weights and baselines live in `public.scoring_config`. They were seeded
verbatim from the AMP documents in
`supabase/migrations/20260422112622_*.sql`.

### Adoption — baseline weighting (master doc §4)
```
Participation 20% · Ownership 40% · Confidence 40%
```
Stored at `scoring_config.config_key = 'adoption_weights_baseline'`.

### Adoption — phase weighting (master doc §4)
| Phase | P | O | C |
|---|---|---|---|
| Design & Build | 35% | 35% | 30% |
| Training & Testing | 20% | 40% | 40% |
| Post Go-Live | 10% | 45% | 45% |

Stored at `scoring_config.config_key = 'adoption_weights_phase'`.

### Pillar trait weights & baselines

| Pillar | Source doc | Config key |
|---|---|---|
| Participation | Participation Framework §3 | `participation_traits` |
| Ownership | Ownership Framework §3 | `ownership_traits` |
| Confidence | Confidence Framework §3 | `confidence_traits` |

Each entry stores `{ weight, baseline_mean, baseline_sd, half_life_days }` —
all values copied verbatim from the docs. Admins edit them in
`/admin/scoring-config`.

### Defaults (master doc §6)
| Setting | Default | Config key |
|---|---|---|
| Rolling window | 14 days | `rolling_window_days` |
| Half-life | 7 days | `half_life_days` |
| Baseline refresh | 8–12 weeks | `baseline_refresh_weeks` |
| Processing model | hybrid | `processing_mode` |
| Desired adoption target | configurable | `desired_adoption_target` |
| Adoption weighting mode | baseline | `adoption_weight_mode` |

---

## 3. Live dashboards are dynamically calculated

The dashboards no longer fabricate trends. Proof:

- **End-user dashboard** (`src/pages/user/Dashboard.tsx`)
  reads `user.scores.adoption` directly from `public.scores.adoption_dashboard`
  via `AuthContext.fetchDemoUser()`.
- **Change-manager dashboard** (`src/pages/manage/Dashboard.tsx`)
  - KPI cards: `useScores()` → `*_dashboard` columns, no client multiplication.
  - Trend chart: `useScoreHistory()` → grouped by `week_label`. The synthetic
    10-week-loop trend builder has been removed.
  - Per-initiative trend: `score_history.initiative_id` filter.
  - Team comparison: averages `*_dashboard` columns from `scores`.
- **Drill-down** (`src/pages/manage/ScoringDrillDown.tsx`)
  reads `trait_observations` row-by-row — every variable shown to the user is
  the exact value persisted by `score-recalc`.

There are no `Math.random`, no hard-coded sample arrays, and no "demo trend"
generators in any scoring path. Empty datasets surface as empty states.

---

## 4. Admin-configurable inputs trigger recalculation

`/admin/scoring-config` exposes:
- weighting mode (baseline vs phase)
- desired adoption target
- rolling window (7 / 14 / 30)
- half-life
- per-trait weights & baselines
- "Recalculate now" button → `supabase.functions.invoke('score-recalc')`

The edge function reads `scoring_config` at the start of every run, so any
admin change is reflected in the next recalc with **no code path containing
fallback/default values that could mask a config update**.

---

## 5. Both weighting modes verified

`score-recalc/index.ts → adoption100()` selects the active weight set:

```ts
const mode = config.adoption_weight_mode; // 'baseline' | 'phase'
const weights = mode === 'phase'
  ? config.adoption_weights_phase[initiative.phase]
  : config.adoption_weights_baseline;
```

Both branches use the verbatim percentages from §4 of the master doc.

---

## 6. Ownership overload is a flag, not a deduction

Per Ownership Framework §5 (operational safeguard):
- Capacity rule `H_journey + H_BAU ≤ 40` is checked from `user_capacity`.
- Violation writes a row to `behavioural_flags` with
  `flag_type = 'ownership_overload'`, `severity = 'warning'`.
- The Ownership pillar score itself is computed independently and is **never
  reduced** by overload state.

Code: `score-recalc/index.ts → checkOwnershipOverload()`.
UI: surfaced in `/manage/scoring-drilldown` as a warning chip.

---

## 7. Negative signals & calibration are flag-only

- **Participation negative signals** (Participation Framework §4) are stored
  in `behavioural_events` with negative `value` and processed by the trait
  pipeline so they bias `x_i` correctly without short-circuiting the weighted
  equation.
- **Confidence calibration** (Confidence Framework §5) — over/under-confidence
  is detected in `score-recalc → checkConfidenceCalibration()` and written to
  `behavioural_flags`. It does **not** modify the Confidence pillar score.

This preserves the documented separation between core weighted equations and
operational flags.

---

## 8. Document compliance checklist

| Document | Section | Implemented? | Where |
|---|---|---|---|
| Master | §3 Hybrid processing | ✅ | event-driven inserts + `score-recalc` batch + rolling-window math |
| Master | §4 Adoption weights (baseline + phase) | ✅ | `adoption100()` |
| Master | §5 Time-progress multiplier | ✅ | `timeProgress()` + `*_dashboard` columns |
| Master | §6 Defaults (14d / 7d / 8–12w / hybrid) | ✅ | `scoring_config` seed |
| Master | §7 Drill-down auditability | ✅ | `trait_observations` + `/manage/scoring-drilldown` |
| Participation | §3 Trait list & weights | ✅ | `participation_traits` config |
| Participation | §4 Negative signals separate from raw | ✅ | events with negative `value`, never deducted post-hoc |
| Participation | §5 Click safeguard | ✅ | `event_type = 'click_only'` excluded from trait inputs |
| Ownership | §3 Trait list & weights | ✅ | `ownership_traits` config |
| Ownership | §5 Capacity rule (≤40h, flag-only) | ✅ | `checkOwnershipOverload()` |
| Confidence | §3 Trait list & weights | ✅ | `confidence_traits` config |
| Confidence | §5 Calibration (over/under) | ✅ | `checkConfidenceCalibration()` |
| Confidence | §6 Self-report cannot dominate | ✅ | self-report trait weight ≤ documented cap, enforced in seed |

No deviations from the documents have been introduced.

---

## 9. How to re-run validation

1. Open `/admin/scoring-config` and adjust any weight or the rolling window.
2. Click **Recalculate scores now**.
3. Open `/manage/scoring-drilldown` for any user — every value shown should
   trace back to a `trait_observations` row written in step 2.
4. Open `/manage` — KPI tiles, trend chart, team comparison should all reflect
   the new configuration.
5. Add a row to `user_capacity` with `h_journey + h_bau > 40` and re-run
   recalc — an `ownership_overload` flag should appear and the Ownership
   pillar score should be unchanged.
