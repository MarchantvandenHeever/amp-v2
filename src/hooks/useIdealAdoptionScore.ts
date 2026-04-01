import { useScoringConfig } from '@/hooks/useScoringConfig';
import { useInitiatives, useAssignments, useJourneys } from '@/hooks/useSupabaseData';

/**
 * Calculates the ideal adoption score based on TIME progression through the initiative.
 * 
 * Framework (from AMP spreadsheet):
 * - Ideal Category Adoption Score = desired target (e.g. 85%)
 * - Ideal Project Adoption Score = target × (elapsed_time / total_duration)
 * 
 * At month 3 of a 10-month initiative with target 85%:
 *   ideal = 85% × (3/10) = 25.5%
 * 
 * This is LINEAR over time — if a user has a perfect score at every point,
 * at 50% through the timeline the ideal adoption is 50% of the target.
 */
export function useIdealAdoptionScore(userId?: string) {
  const { data: config } = useScoringConfig();
  const { data: initiatives } = useInitiatives();
  const { data: allAssignments } = useAssignments();
  const { data: allJourneys } = useJourneys();

  const desiredTarget = ((config as any)?.desired_adoption_target ?? 100) as number;

  // All hooks called above — safe to do conditional logic now
  if (!userId || !initiatives || !allAssignments || !allJourneys) {
    return { idealScore: 0, journeyProgress: 0, timeProgress: 0, desiredTarget };
  }

  const userAssignments = allAssignments.filter((a: any) => a.user_id === userId);
  const userJourneyIds = userAssignments.map((a: any) => a.journey_id);
  const userJourneys = allJourneys.filter((j: any) => userJourneyIds.includes(j.id));

  const initiativeIds = [...new Set(userJourneys.map((j: any) => j.initiative_id).filter(Boolean))];
  const userInitiatives = initiatives.filter((i: any) => initiativeIds.includes(i.id));

  if (userInitiatives.length === 0) {
    const activeInitiatives = initiatives.filter((i: any) => i.status === 'active');
    if (activeInitiatives.length === 0) {
      return { idealScore: 0, journeyProgress: 0, timeProgress: 0, desiredTarget };
    }
    return calculateFromInitiatives(activeInitiatives, desiredTarget);
  }

  return calculateFromInitiatives(userInitiatives, desiredTarget);
}

function calculateFromInitiatives(
  initiatives: any[],
  desiredTarget: number
) {
  const now = new Date();
  let totalDuration = 0;
  let totalElapsed = 0;

  for (const init of initiatives) {
    if (!init.start_date || !init.end_date) continue;
    const start = new Date(init.start_date);
    const end = new Date(init.end_date);
    const duration = end.getTime() - start.getTime();
    const elapsed = Math.max(0, Math.min(now.getTime() - start.getTime(), duration));
    totalDuration += duration;
    totalElapsed += elapsed;
  }

  if (totalDuration === 0) {
    return { idealScore: 0, journeyProgress: 0, timeProgress: 0, desiredTarget };
  }

  const timeProgress = Math.round((totalElapsed / totalDuration) * 100);
  const idealScore = Math.round((totalElapsed / totalDuration) * desiredTarget);

  return { idealScore, journeyProgress: timeProgress, timeProgress, desiredTarget };
}

/**
 * Given a date and initiative date range, compute ideal adoption score at that point.
 * Used for plotting ideal score on trend charts.
 */
export function getIdealScoreAtDate(
  date: Date | string,
  startDate: string,
  endDate: string,
  desiredTarget: number
): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return 0;
  const elapsed = Math.max(0, Math.min(d.getTime() - start.getTime(), duration));
  return Math.round((elapsed / duration) * desiredTarget);
}
