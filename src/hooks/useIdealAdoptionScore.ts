import { useScoringConfig } from '@/hooks/useScoringConfig';
import { useAllJourneyItems, useAssignments } from '@/hooks/useSupabaseData';

/**
 * Calculates the ideal adoption score for a user based on their journey progress.
 * 
 * Logic: If a user is X% through their journey, the ideal (maximum possible)
 * adoption score = journeyProgress% × desiredAdoptionTarget
 * 
 * e.g., 50% through journey with target of 100 → ideal = 50
 */
export function useIdealAdoptionScore(userId?: string) {
  const { data: config } = useScoringConfig();
  const { data: allItems } = useAllJourneyItems();
  const { data: allAssignments } = useAssignments();

  if (!userId || !allItems || !allAssignments || !config) {
    return { idealScore: 0, journeyProgress: 0, desiredTarget: 100 };
  }

  const desiredTarget = (config as any).desired_adoption_target ?? 100;

  // Get user's assigned journeys
  const userAssignments = allAssignments.filter((a: any) => a.user_id === userId);
  const userJourneyIds = userAssignments.map((a: any) => a.journey_id);
  const userItems = allItems.filter((item: any) => userJourneyIds.includes(item.journey_id));

  if (userItems.length === 0) {
    return { idealScore: 0, journeyProgress: 0, desiredTarget };
  }

  const completedCount = userItems.filter((i: any) => i.status === 'completed').length;
  const journeyProgress = Math.round((completedCount / userItems.length) * 100);
  const idealScore = Math.round((journeyProgress / 100) * desiredTarget);

  return { idealScore, journeyProgress, desiredTarget };
}
