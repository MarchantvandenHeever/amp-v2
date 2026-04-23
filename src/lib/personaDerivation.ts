/**
 * Live persona derivation based on Adoption Performance (ΔA).
 *
 * ΔA = adoption_dashboard − adoption_ideal  (percentage-points, both p-scaled)
 *
 *   Power User     → ΔA ≥ +5pp        (Ahead of ideal)
 *   Standard User  → −5 ≤ ΔA < +5pp   (On Track)
 *   Reluctant User → ΔA < −5pp        (Behind / At Risk)
 *
 * Roles override performance bands:
 *   super_admin     → 'Admin'
 *   change_manager  → 'Change Manager'
 *   team_lead       → 'Manager'
 *
 * If no score row exists yet, falls back to the manually-set profile.persona
 * (or 'Standard User' as last resort) so brand-new users are not mis-labelled
 * as "Reluctant" before they have any data.
 */

export type LivePersona =
  | 'Power User'
  | 'Standard User'
  | 'Reluctant User'
  | 'Manager'
  | 'Change Manager'
  | 'Admin';

export interface PersonaScoreInput {
  adoption_dashboard?: number | string | null;
  adoption_ideal?: number | string | null;
}

export interface PersonaProfileInput {
  role?: string | null;
  persona?: string | null;
}

const POWER_THRESHOLD = 5;       // ΔA ≥ +5pp
const RELUCTANT_THRESHOLD = -5;  // ΔA < −5pp

export function derivePersonaFromDelta(deltaA: number): LivePersona {
  if (deltaA >= POWER_THRESHOLD) return 'Power User';
  if (deltaA < RELUCTANT_THRESHOLD) return 'Reluctant User';
  return 'Standard User';
}

export function derivePersona(
  profile: PersonaProfileInput | null | undefined,
  score: PersonaScoreInput | null | undefined,
): LivePersona {
  // Role-based personas always win
  switch (profile?.role) {
    case 'super_admin': return 'Admin';
    case 'change_manager': return 'Change Manager';
    case 'team_lead': return 'Manager';
  }

  // Need both numbers to derive live; otherwise keep stored persona
  const dash = score?.adoption_dashboard;
  const ideal = score?.adoption_ideal;
  if (dash == null || ideal == null) {
    const stored = profile?.persona as LivePersona | undefined;
    return stored || 'Standard User';
  }

  const deltaA = Number(dash) - Number(ideal);
  if (!Number.isFinite(deltaA)) {
    return (profile?.persona as LivePersona) || 'Standard User';
  }
  return derivePersonaFromDelta(deltaA);
}
